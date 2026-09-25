import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';
import {
  approveDoctor,
  bookAppointment,
  completeConsultation,
  completedConsultation,
  createAdmin,
  createApprovedDoctor,
  createDoctor,
  createPatient,
  ctxOf,
  giveFullWeekAvailability,
} from './fixtures';
import type { Ctx } from './fixtures';

/**
 * The fixtures themselves.
 *
 * Each one asserts its result through the API rather than through the database
 * it wrote to: a fixture that only checks its own insert can be wrong about
 * everything the tests built on it then assume.
 */
describe('fixtures', () => {
  let harness: TestApp;
  let ctx: Ctx;

  beforeAll(async () => {
    harness = await createTestApp();
    ctx = ctxOf(harness);
  });

  afterAll(async () => {
    await closeTestApp(harness);
  });

  beforeEach(async () => {
    await resetDatabase(harness.app);
  });

  it('creates a patient whose profile is complete', async () => {
    const patient = await createPatient(ctx);

    const me = await ctx.http.get('/api/auth/me').set('Cookie', patient.cookie);

    expect(me.status).toBe(200);
    expect(me.body.id).toBe(patient.userId);
    expect(me.body.role).toBe('PATIENT');
    // Booking requires this, so every booking test depends on it.
    expect(me.body.profileComplete).toBe(true);
  });

  it('creates a doctor who is pending, and therefore absent from the directory', async () => {
    const doctor = await createDoctor(ctx);

    const mine = await ctx.http.get('/api/doctors/me').set('Cookie', doctor.cookie);
    expect(mine.status).toBe(200);
    expect(mine.body.approvalState).toBe('PENDING');

    const directory = await ctx.http.get('/api/doctors').set('Cookie', doctor.cookie);
    expect(directory.status).toBe(200);
    expect(directory.body.map((d: { id: string }) => d.id)).not.toContain(doctor.profileId);
  });

  it('promotes a doctor into the directory', async () => {
    const doctor = await createDoctor(ctx);
    await approveDoctor(ctx, doctor.profileId);

    const directory = await ctx.http.get('/api/doctors').set('Cookie', doctor.cookie);

    expect(directory.body.map((d: { id: string }) => d.id)).toContain(doctor.profileId);
  });

  it('creates an administrator who can act as one', async () => {
    const admin = await createAdmin(ctx);

    const stats = await ctx.http.get('/api/admin/stats').set('Cookie', admin.cookie);

    expect(stats.status).toBe(200);
    expect(stats.body).toHaveProperty('patients');
  });

  it('gives a doctor bookable availability', async () => {
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);

    const slots = await ctx.http
      .get(`/api/doctors/${doctor.profileId}/slots`)
      .set('Cookie', doctor.cookie);

    expect(slots.status).toBe(200);
    expect(slots.body.length).toBeGreaterThan(0);
  });

  it('books an appointment the patient can then read back', async () => {
    const patient = await createPatient(ctx);
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);

    const appointment = await bookAppointment(ctx, patient, doctor.profileId);

    const listed = await ctx.http.get('/api/appointments').set('Cookie', patient.cookie);
    expect(listed.body.map((a: { id: string }) => a.id)).toContain(appointment.id);

    const read = await ctx.http
      .get(`/api/appointments/${appointment.id}`)
      .set('Cookie', patient.cookie);
    expect(read.status).toBe(200);
    expect(read.body.state).toBe('SCHEDULED');
    expect(read.body.patient.id).toBe(patient.profileId);
    expect(read.body.doctor.id).toBe(doctor.profileId);
  });

  it('completes a consultation, which is the precondition for writing a record', async () => {
    const patient = await createPatient(ctx);
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);
    const appointment = await bookAppointment(ctx, patient, doctor.profileId);

    await completeConsultation(ctx, patient, doctor, appointment.id);

    const context = await ctx.http
      .get(`/api/consultations/${appointment.id}`)
      .set('Cookie', doctor.cookie);

    expect(context.status).toBe(200);
    expect(context.body.sessionState).toBe('COMPLETED');

    const read = await ctx.http
      .get(`/api/appointments/${appointment.id}`)
      .set('Cookie', doctor.cookie);
    expect(read.body.state).toBe('COMPLETED');
  });

  it('composes the whole path in one call', async () => {
    const { patient, doctor, appointmentId } = await completedConsultation(ctx);

    const read = await ctx.http
      .get(`/api/appointments/${appointmentId}`)
      .set('Cookie', patient.cookie);

    expect(read.body.state).toBe('COMPLETED');
    expect(read.body.doctor.id).toBe(doctor.profileId);
  });
});
