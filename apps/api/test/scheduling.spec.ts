import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';
import {
  bookAppointment,
  completeConsultation,
  createApprovedDoctor,
  createPatient,
  ctxOf,
  firstBookableSlot,
  giveFullWeekAvailability,
} from './fixtures';
import type { Ctx } from './fixtures';

/**
 * When consultations can happen.
 *
 * The rules here are the ones with a race in them, so the interesting tests are
 * the ones that try to arrive at a forbidden state rather than the ones that
 * confirm the happy path.
 */

/** The local calendar date of an instant, as the availability rules use. */
function localDateOf(instant: string): string {
  const date = new Date(instant);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

describe('scheduling', () => {
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

  describe('booking', () => {
    it('accepts a slot the doctor is offering, and the patient can see it', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);

      const booked = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({ doctorId: doctor.profileId, startsAt: slot, reasonForVisit: 'A persistent cough' });

      expect(booked.status).toBe(201);
      expect(booked.body.state).toBe('SCHEDULED');

      const listed = await ctx.http
        .get('/api/appointments?scope=upcoming')
        .set('Cookie', patient.cookie);

      expect(listed.body.map((a: { id: string }) => a.id)).toContain(booked.body.id);
    });

    /**
     * A time the doctor is not offering is refused as a conflict rather than as
     * a malformed request: the service asks "is this one of the slots you are
     * offering", and every way of failing that question — outside a window, off
     * the 30-minute grid, on a blocked date, or already held — gives the same
     * answer. Only a time in the past is refused earlier, as a bad request.
     */
    it('refuses a time outside the doctor’s windows', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);

      // A day later, at 03:00 — comfortably in the future, and outside the
      // 09:00–17:00 windows the fixture creates. The day is moved first so this
      // cannot accidentally land in the past and test the wrong rule, which is
      // what an earlier version of this test did.
      const outside = new Date(slot);
      outside.setDate(outside.getDate() + 1);
      outside.setHours(3, 0, 0, 0);
      expect(outside.getTime()).toBeGreaterThan(Date.now());

      const refused = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({
          doctorId: doctor.profileId,
          startsAt: outside.toISOString(),
          reasonForVisit: 'A persistent cough',
        });

      expect(refused.status).toBe(409);
    });

    it('refuses a time that is not on the slot grid', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);
      const offGrid = new Date(new Date(slot).getTime() + 7 * 60 * 1000);

      const refused = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({
          doctorId: doctor.profileId,
          startsAt: offGrid.toISOString(),
          reasonForVisit: 'A persistent cough',
        });

      expect(refused.status).toBe(409);
    });

    it('refuses a time on a date the doctor has blocked', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);
      const blockedDate = localDateOf(slot);

      await ctx.http
        .post('/api/availability/exceptions')
        .set('Cookie', doctor.cookie)
        .send({ date: blockedDate, reason: 'Away' });

      const refused = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({ doctorId: doctor.profileId, startsAt: slot, reasonForVisit: 'A persistent cough' });

      expect(refused.status).toBe(409);
    });

    it('refuses a time in the past', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const refused = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({
          doctorId: doctor.profileId,
          startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          reasonForVisit: 'A persistent cough',
        });

      expect(refused.status).toBe(400);
    });

    it('writes no appointment when a booking is refused', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({
          doctorId: doctor.profileId,
          startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          reasonForVisit: 'A persistent cough',
        });

      expect(await ctx.prisma.appointment.count()).toBe(0);
    });

    it('produces exactly one appointment when two requests take the same slot at once', async () => {
      const first = await createPatient(ctx);
      const second = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, first.cookie);

      const book = (patient: typeof first) =>
        ctx.http
          .post('/api/appointments')
          .set('Cookie', patient.cookie)
          .send({ doctorId: doctor.profileId, startsAt: slot, reasonForVisit: 'A persistent cough' });

      const [a, b] = await Promise.all([book(first), book(second)]);
      const statuses = [a.status, b.status].sort();

      // Whichever way the race falls — the loser refused by the service's slot
      // check or by the database's partial unique index — the outcome is the
      // same, and that is the guarantee worth pinning.
      expect(statuses).toEqual([201, 409]);
      expect(await ctx.prisma.appointment.count()).toBe(1);
    });

    it('refuses a doctor who is not approved', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);

      // Withdraw approval after the slots were already derived.
      await ctx.prisma.doctorProfile.update({
        where: { id: doctor.profileId },
        data: { approvalState: 'PENDING' },
      });

      const refused = await ctx.http
        .post('/api/appointments')
        .set('Cookie', patient.cookie)
        .send({ doctorId: doctor.profileId, startsAt: slot, reasonForVisit: 'A persistent cough' });

      expect(refused.status).toBe(404);
    });
  });

  describe('rescheduling', () => {
    it('moves an appointment to another offered slot', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const slots = await ctx.http
        .get(`/api/doctors/${doctor.profileId}/slots`)
        .set('Cookie', patient.cookie);
      const elsewhere = slots.body.find((s: { startsAt: string }) => s.startsAt !== appointment.startsAt);

      const moved = await ctx.http
        .post(`/api/appointments/${appointment.id}/reschedule`)
        .set('Cookie', patient.cookie)
        .send({ startsAt: elsewhere.startsAt });

      expect(moved.status).toBe(201);
      expect(moved.body.startsAt).toBe(elsewhere.startsAt);
    });

    it('leaves the original appointment alone when the new time is taken', async () => {
      const first = await createPatient(ctx);
      const second = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const mine = await bookAppointment(ctx, first, doctor.profileId);
      const theirs = await bookAppointment(ctx, second, doctor.profileId);

      const refused = await ctx.http
        .post(`/api/appointments/${mine.id}/reschedule`)
        .set('Cookie', first.cookie)
        .send({ startsAt: theirs.startsAt });

      expect(refused.status).toBe(409);

      // The transaction aborted, so the original slot was never released.
      const stillMine = await ctx.http
        .get(`/api/appointments/${mine.id}`)
        .set('Cookie', first.cookie);
      expect(stillMine.body.startsAt).toBe(mine.startsAt);
      expect(stillMine.body.state).toBe('SCHEDULED');
    });

    it('refuses to move an appointment that has already started', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      await ctx.prisma.appointment.update({
        where: { id: appointment.id },
        data: { startsAt: new Date(Date.now() - 60 * 60 * 1000) },
      });

      const slots = await ctx.http
        .get(`/api/doctors/${doctor.profileId}/slots`)
        .set('Cookie', patient.cookie);

      const refused = await ctx.http
        .post(`/api/appointments/${appointment.id}/reschedule`)
        .set('Cookie', patient.cookie)
        .send({ startsAt: slots.body[0].startsAt });

      expect(refused.status).toBe(400);
    });
  });

  describe('cancellation', () => {
    it('records the patient as the canceller', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const cancelled = await ctx.http
        .post(`/api/appointments/${appointment.id}/cancel`)
        .set('Cookie', patient.cookie)
        .send({ reason: 'Something came up' });

      expect(cancelled.status).toBe(201);
      expect(cancelled.body.state).toBe('CANCELLED');
      expect(cancelled.body.cancelledBy).toBe('PATIENT');
      expect(cancelled.body.cancellationReason).toBe('Something came up');
    });

    it('records the doctor as the canceller', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const cancelled = await ctx.http
        .post(`/api/appointments/${appointment.id}/cancel`)
        .set('Cookie', doctor.cookie)
        .send({ reason: 'An emergency' });

      expect(cancelled.body.cancelledBy).toBe('DOCTOR');
    });

    it('releases the slot for someone else to book', async () => {
      const first = await createPatient(ctx);
      const second = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const appointment = await bookAppointment(ctx, first, doctor.profileId);

      await ctx.http
        .post(`/api/appointments/${appointment.id}/cancel`)
        .set('Cookie', first.cookie)
        .send({ reason: 'Something came up' });

      // The partial unique index is restricted to SCHEDULED rows, so a
      // cancelled appointment stops reserving its slot — this is what would
      // break if the index lost its WHERE clause.
      const rebooked = await ctx.http
        .post('/api/appointments')
        .set('Cookie', second.cookie)
        .send({
          doctorId: doctor.profileId,
          startsAt: appointment.startsAt,
          reasonForVisit: 'A persistent cough',
        });

      expect(rebooked.status).toBe(201);
    });

    it('refuses to cancel a completed appointment', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);
      await completeConsultation(ctx, patient, doctor, appointment.id);

      const refused = await ctx.http
        .post(`/api/appointments/${appointment.id}/cancel`)
        .set('Cookie', patient.cookie)
        .send({ reason: 'Something came up' });

      expect(refused.status).toBe(400);
    });
  });

  describe('derived slots', () => {
    it('withdraws a blocked date and leaves the rest of the week alone', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const before = await ctx.http
        .get(`/api/doctors/${doctor.profileId}/slots`)
        .set('Cookie', patient.cookie);
      const blockedDate = localDateOf(before.body[0].startsAt);

      const blocked = await ctx.http
        .post('/api/availability/exceptions')
        .set('Cookie', doctor.cookie)
        .send({ date: blockedDate, reason: 'Away' });
      expect(blocked.status).toBe(201);

      const after = await ctx.http
        .get(`/api/doctors/${doctor.profileId}/slots`)
        .set('Cookie', patient.cookie);

      const onBlockedDate = (after.body as Array<{ startsAt: string }>).filter(
        (slot) => localDateOf(slot.startsAt) === blockedDate,
      );
      expect(onBlockedDate).toHaveLength(0);
      // Slots are never materialised, so the rest of the horizon is untouched.
      expect(after.body.length).toBeGreaterThan(0);
    });

    it('withdraws a slot once it is held', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);

      const slot = await firstBookableSlot(ctx, doctor.profileId, patient.cookie);
      await bookAppointment(ctx, patient, doctor.profileId, slot);

      const after = await ctx.http
        .get(`/api/doctors/${doctor.profileId}/slots`)
        .set('Cookie', patient.cookie);

      expect(after.body.map((s: { startsAt: string }) => s.startsAt)).not.toContain(slot);
    });
  });
});
