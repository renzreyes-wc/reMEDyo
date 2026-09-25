import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';
import {
  bookAppointment,
  completeConsultation,
  completedConsultation,
  createApprovedDoctor,
  createPatient,
  ctxOf,
  giveFullWeekAvailability,
} from './fixtures';
import type { Ctx } from './fixtures';

const NOTE = {
  findings: 'Chest clear on auscultation.',
  diagnosis: 'Viral upper respiratory infection.',
  recommendations: 'Rest, fluids, and review in a week if no better.',
};

const PRESCRIPTION = {
  medication: 'Amoxicillin',
  dosage: '500mg',
  frequency: 'Three times daily',
  durationDays: 7,
};

/**
 * The medical record.
 *
 * Two rules carry the weight here. A note may be written only by the doctor who
 * held the consultation — role *and* ownership, not role alone — and a record
 * may be read by a doctor only where an appointment relationship exists. Both
 * are the kind of rule that is invisible until it is wrong.
 */
describe('records', () => {
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

  async function writeNote(cookie: string, appointmentId: string) {
    return ctx.http
      .put(`/api/records/appointments/${appointmentId}/note`)
      .set('Cookie', cookie)
      .send(NOTE);
  }

  describe('who may write', () => {
    it('lets the authoring doctor sign a note and issue a prescription', async () => {
      const { doctor, appointmentId } = await completedConsultation(ctx);

      const note = await writeNote(doctor.cookie, appointmentId);
      expect(note.status).toBe(200);
      expect(note.body.diagnosis).toBe(NOTE.diagnosis);

      const prescription = await ctx.http
        .post(`/api/records/appointments/${appointmentId}/prescriptions`)
        .set('Cookie', doctor.cookie)
        .send(PRESCRIPTION);
      expect(prescription.status).toBe(201);
      expect(prescription.body.medication).toBe(PRESCRIPTION.medication);
    });

    it('refuses a different doctor, even an approved one', async () => {
      const { appointmentId } = await completedConsultation(ctx);
      const other = await createApprovedDoctor(ctx);

      const note = await writeNote(other.cookie, appointmentId);
      expect(note.status).toBe(403);

      const prescription = await ctx.http
        .post(`/api/records/appointments/${appointmentId}/prescriptions`)
        .set('Cookie', other.cookie)
        .send(PRESCRIPTION);
      expect(prescription.status).toBe(403);

      expect(await ctx.prisma.consultationNote.count()).toBe(0);
      expect(await ctx.prisma.prescription.count()).toBe(0);
    });

    it('refuses the patient, at the role gate', async () => {
      const { patient, appointmentId } = await completedConsultation(ctx);

      expect((await writeNote(patient.cookie, appointmentId)).status).toBe(403);

      const prescription = await ctx.http
        .post(`/api/records/appointments/${appointmentId}/prescriptions`)
        .set('Cookie', patient.cookie)
        .send(PRESCRIPTION);
      expect(prescription.status).toBe(403);
    });
  });

  describe('when writing is permitted', () => {
    it('refuses a note on a consultation that has not been completed', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const refused = await writeNote(doctor.cookie, appointment.id);

      expect(refused.status).toBe(400);
      expect(JSON.stringify(refused.body)).toContain('Complete the consultation');
      expect(await ctx.prisma.consultationNote.count()).toBe(0);
    });

    it('refuses a prescription on a consultation that has not been completed', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const refused = await ctx.http
        .post(`/api/records/appointments/${appointment.id}/prescriptions`)
        .set('Cookie', doctor.cookie)
        .send(PRESCRIPTION);

      expect(refused.status).toBe(400);
      expect(await ctx.prisma.prescription.count()).toBe(0);
    });

    it('revises a note rather than creating a second one', async () => {
      const { doctor, appointmentId } = await completedConsultation(ctx);

      const first = await writeNote(doctor.cookie, appointmentId);
      const revised = await writeNote(doctor.cookie, appointmentId);

      expect(revised.status).toBe(200);
      expect(revised.body.id).toBe(first.body.id);
      expect(await ctx.prisma.consultationNote.count()).toBe(1);
    });
  });

  describe('who may read', () => {
    it('gives a patient their own record and nothing else', async () => {
      const mine = await completedConsultation(ctx);
      const theirs = await completedConsultation(ctx);
      await writeNote(mine.doctor.cookie, mine.appointmentId);
      await writeNote(theirs.doctor.cookie, theirs.appointmentId);

      const record = await ctx.http.get('/api/records/me').set('Cookie', mine.patient.cookie);

      expect(record.status).toBe(200);
      const appointmentIds = (record.body as Array<{ appointment: { id: string } }>).map(
        (entry) => entry.appointment.id,
      );
      expect(appointmentIds).toContain(mine.appointmentId);
      expect(appointmentIds).not.toContain(theirs.appointmentId);
    });

    it('refuses a patient the doctor-facing route that takes a patient identifier', async () => {
      const { patient } = await completedConsultation(ctx);

      const refused = await ctx.http
        .get(`/api/records/patients/${patient.profileId}`)
        .set('Cookie', patient.cookie);

      // Even naming themselves: the route is the doctor's view, and the
      // patient's own view is a different route with no identifier in it.
      expect(refused.status).toBe(403);
    });

    it('refuses a doctor with no relationship to the patient', async () => {
      const { patient } = await completedConsultation(ctx);
      const stranger = await createApprovedDoctor(ctx);

      const refused = await ctx.http
        .get(`/api/records/patients/${patient.profileId}`)
        .set('Cookie', stranger.cookie);

      expect(refused.status).toBe(404);
    });

    it('gives a doctor the whole record once one appointment links them', async () => {
      const { patient, doctor, appointmentId } = await completedConsultation(ctx);
      await writeNote(doctor.cookie, appointmentId);

      const record = await ctx.http
        .get(`/api/records/patients/${patient.profileId}`)
        .set('Cookie', doctor.cookie);

      expect(record.status).toBe(200);
      expect((record.body as Array<{ appointment: { id: string } }>).length).toBeGreaterThan(0);
    });

    it('separates the participant view of one entry from the relationship view of a whole record', async () => {
      // Two doctors, one patient. Doctor A treats and writes the note; doctor B
      // has only ever booked an appointment with the same patient.
      //
      // The two read routes are scoped differently, and the difference is worth
      // pinning because it looks like an inconsistency until you see it:
      // one appointment's entry is for its participants, while a patient's
      // whole record is for any doctor with a relationship.
      const patient = await createPatient(ctx);
      const doctorA = await createApprovedDoctor(ctx);
      const doctorB = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctorA.cookie);
      await giveFullWeekAvailability(ctx, doctorB.cookie);

      const treated = await bookAppointment(ctx, patient, doctorA.profileId);
      await completeConsultation(ctx, patient, doctorA, treated.id);
      await writeNote(doctorA.cookie, treated.id);

      const alsoBooked = await bookAppointment(ctx, patient, doctorB.profileId);
      expect(alsoBooked.id).not.toBe(treated.id);

      // Doctor B is not a participant in A's appointment, so its entry is not
      // theirs to read.
      const entry = await ctx.http
        .get(`/api/records/appointments/${treated.id}`)
        .set('Cookie', doctorB.cookie);
      expect(entry.status).toBe(404);

      // But the relationship is what governs the patient's record, so the same
      // doctor sees A's note in it — including notes they did not write. That
      // is the consequence the medical-records capability accepts.
      const record = await ctx.http
        .get(`/api/records/patients/${patient.profileId}`)
        .set('Cookie', doctorB.cookie);
      expect(record.status).toBe(200);

      const treatedEntry = (record.body as Array<{ appointment: { id: string }; note: { diagnosis: string } | null }>)
        .find((row) => row.appointment.id === treated.id);
      expect(treatedEntry?.note?.diagnosis).toBe(NOTE.diagnosis);
    });
  });

  describe('retention', () => {
    it('offers no way to delete a note', async () => {
      const { doctor, appointmentId } = await completedConsultation(ctx);
      await writeNote(doctor.cookie, appointmentId);

      const attempted = await ctx.http
        .delete(`/api/records/appointments/${appointmentId}/note`)
        .set('Cookie', doctor.cookie);

      // The absence of the route is the enforcement, so a 404 is the guarantee.
      expect(attempted.status).toBe(404);
      expect(await ctx.prisma.consultationNote.count()).toBe(1);
    });

    it('offers no way to delete a prescription', async () => {
      const { doctor, appointmentId } = await completedConsultation(ctx);
      const issued = await ctx.http
        .post(`/api/records/appointments/${appointmentId}/prescriptions`)
        .set('Cookie', doctor.cookie)
        .send(PRESCRIPTION);

      const attempted = await ctx.http
        .delete(`/api/records/appointments/${appointmentId}/prescriptions/${issued.body.id}`)
        .set('Cookie', doctor.cookie);

      expect(attempted.status).toBe(404);
      expect(await ctx.prisma.prescription.count()).toBe(1);
    });
  });

  describe('what a record entry contains', () => {
    it('returns the appointment, its note and its prescriptions together', async () => {
      const { patient, doctor, appointmentId } = await completedConsultation(ctx);
      await writeNote(doctor.cookie, appointmentId);
      await ctx.http
        .post(`/api/records/appointments/${appointmentId}/prescriptions`)
        .set('Cookie', doctor.cookie)
        .send(PRESCRIPTION);

      const record = await ctx.http
        .get(`/api/records/appointments/${appointmentId}`)
        .set('Cookie', patient.cookie);

      expect(record.status).toBe(200);
      expect(record.body.appointment.id).toBe(appointmentId);
      expect(record.body.note.diagnosis).toBe(NOTE.diagnosis);
      expect(record.body.prescriptions).toHaveLength(1);
      // Generation is disabled in the test environment, so there is no summary
      // rather than a broken one.
      expect(record.body.summary).toBeNull();
    });
  });
});
