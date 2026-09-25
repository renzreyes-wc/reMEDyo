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
  giveFullWeekAvailability,
} from './fixtures';
import type { Ctx } from './fixtures';

/**
 * The room where the consultation happens.
 *
 * Whether a participant may join is decided by the appointment's state and not
 * by the clock — a deliberate departure from an earlier design, and the reason
 * these tests pin the state transitions rather than any timing.
 */
describe('consultations', () => {
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

  /** A patient, an available approved doctor, and an appointment between them. */
  async function booked() {
    const patient = await createPatient(ctx);
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);
    const appointment = await bookAppointment(ctx, patient, doctor.profileId);
    return { patient, doctor, appointmentId: appointment.id };
  }

  describe('joining', () => {
    it('records only the caller’s own arrival', async () => {
      const { patient, doctor, appointmentId } = await booked();

      const joined = await ctx.http
        .post(`/api/consultations/${appointmentId}/join`)
        .set('Cookie', patient.cookie);

      expect(joined.status).toBe(201);
      expect(joined.body.patientJoinedAt).toBeTruthy();
      // The patient's arrival must not write the doctor's.
      expect(joined.body.doctorJoinedAt).toBeNull();
      expect(joined.body.sessionState).toBe('JOINED');
    });

    it('moves to in progress once both have arrived', async () => {
      const { patient, doctor, appointmentId } = await booked();

      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);
      const both = await ctx.http
        .post(`/api/consultations/${appointmentId}/join`)
        .set('Cookie', doctor.cookie);

      expect(both.body.sessionState).toBe('IN_PROGRESS');
    });

    it('does not move the session backwards when someone joins twice', async () => {
      const { patient, doctor, appointmentId } = await booked();

      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);
      const both = await ctx.http
        .post(`/api/consultations/${appointmentId}/join`)
        .set('Cookie', doctor.cookie);
      expect(both.body.sessionState).toBe('IN_PROGRESS');

      const patientAgain = await ctx.http
        .post(`/api/consultations/${appointmentId}/join`)
        .set('Cookie', patient.cookie);

      // The state only ever moves forward, and the earlier timestamps stand.
      expect(patientAgain.body.sessionState).toBe('IN_PROGRESS');
      expect(patientAgain.body.patientJoinedAt).toBe(both.body.patientJoinedAt);
      expect(patientAgain.body.doctorJoinedAt).toBe(both.body.doctorJoinedAt);
    });

    it('shows the doctor the patient’s clinical context, and not the reverse', async () => {
      const { patient, doctor, appointmentId } = await booked();

      await ctx.http
        .patch('/api/patients/me/profile')
        .set('Cookie', patient.cookie)
        .send({ dateOfBirth: '1980-02-02' });
      await ctx.http
        .post('/api/patients/me/history')
        .set('Cookie', patient.cookie)
        .send({ kind: 'ALLERGY', description: 'Penicillin' });

      const asDoctor = await ctx.http
        .get(`/api/consultations/${appointmentId}`)
        .set('Cookie', doctor.cookie);
      expect(asDoctor.body.clinicalContext.allergies).toContain('Penicillin');
      expect(asDoctor.body.clinicalContext.age).toBeGreaterThan(40);

      const asPatient = await ctx.http
        .get(`/api/consultations/${appointmentId}`)
        .set('Cookie', patient.cookie);
      // Absent rather than empty: a patient is not shown a clinical summary of
      // themselves.
      expect(asPatient.body.clinicalContext).toBeUndefined();
    });
  });

  describe('completing', () => {
    it('refuses a patient', async () => {
      const { patient, appointmentId } = await booked();

      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);

      const refused = await ctx.http
        .post(`/api/consultations/${appointmentId}/complete`)
        .set('Cookie', patient.cookie);

      expect(refused.status).toBe(403);
    });

    it('refuses a doctor who did not hold the consultation', async () => {
      const { patient, doctor, appointmentId } = await booked();
      const other = await createApprovedDoctor(ctx);

      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', doctor.cookie);

      const refused = await ctx.http
        .post(`/api/consultations/${appointmentId}/complete`)
        .set('Cookie', other.cookie);

      // Not 404: the other doctor is a participant in nothing here, so the
      // appointment is invisible to them — which is the 404 path. Either way,
      // they cannot close it.
      expect([403, 404]).toContain(refused.status);
      expect(refused.status).not.toBe(201);
    });

    it('requires the doctor to have joined first, and says so', async () => {
      const { doctor, appointmentId } = await booked();

      const refused = await ctx.http
        .post(`/api/consultations/${appointmentId}/complete`)
        .set('Cookie', doctor.cookie);

      expect(refused.status).toBe(400);
      expect(JSON.stringify(refused.body)).toContain('Join the consultation before ending it');
    });

    it('completes the session and the appointment together', async () => {
      const { patient, doctor, appointmentId } = await booked();
      await completeConsultation(ctx, patient, doctor, appointmentId);

      const context = await ctx.http
        .get(`/api/consultations/${appointmentId}`)
        .set('Cookie', doctor.cookie);
      expect(context.body.sessionState).toBe('COMPLETED');

      const appointment = await ctx.http
        .get(`/api/appointments/${appointmentId}`)
        .set('Cookie', doctor.cookie);
      expect(appointment.body.state).toBe('COMPLETED');
    });

    it('refuses to complete twice', async () => {
      const { patient, doctor, appointmentId } = await booked();
      await completeConsultation(ctx, patient, doctor, appointmentId);

      const again = await ctx.http
        .post(`/api/consultations/${appointmentId}/complete`)
        .set('Cookie', doctor.cookie);

      expect(again.status).toBe(400);
    });
  });

  describe('messaging', () => {
    it('refuses a message before joining, and says so', async () => {
      const { patient, appointmentId } = await booked();

      const refused = await ctx.http
        .post(`/api/consultations/${appointmentId}/messages`)
        .set('Cookie', patient.cookie)
        .send({ body: 'Hello' });

      expect(refused.status).toBe(400);
      expect(JSON.stringify(refused.body)).toContain('Join the consultation before sending a message');
    });

    it('refuses an empty message', async () => {
      const { patient, appointmentId } = await booked();
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);

      const refused = await ctx.http
        .post(`/api/consultations/${appointmentId}/messages`)
        .set('Cookie', patient.cookie)
        .send({ body: '   ' });

      expect(refused.status).toBe(400);
    });

    it('carries a message from each participant, attributed to the sender', async () => {
      const { patient, doctor, appointmentId } = await booked();
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', doctor.cookie);

      const fromPatient = await ctx.http
        .post(`/api/consultations/${appointmentId}/messages`)
        .set('Cookie', patient.cookie)
        .send({ body: 'It hurts when I breathe.' });
      expect(fromPatient.status).toBe(201);
      expect(fromPatient.body.senderId).toBe(patient.userId);

      const fromDoctor = await ctx.http
        .post(`/api/consultations/${appointmentId}/messages`)
        .set('Cookie', doctor.cookie)
        .send({ body: 'How long has that been going on?' });
      expect(fromDoctor.body.senderId).toBe(doctor.userId);

      const context = await ctx.http
        .get(`/api/consultations/${appointmentId}`)
        .set('Cookie', patient.cookie);
      expect(context.body.messages).toHaveLength(2);
    });

    it('makes the thread read-only once the consultation has ended, for both parties', async () => {
      const { patient, doctor, appointmentId } = await booked();
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', patient.cookie);
      await ctx.http.post(`/api/consultations/${appointmentId}/join`).set('Cookie', doctor.cookie);
      await ctx.http
        .post(`/api/consultations/${appointmentId}/messages`)
        .set('Cookie', patient.cookie)
        .send({ body: 'It hurts when I breathe.' });

      await ctx.http
        .post(`/api/consultations/${appointmentId}/complete`)
        .set('Cookie', doctor.cookie);

      for (const cookie of [patient.cookie, doctor.cookie]) {
        const refused = await ctx.http
          .post(`/api/consultations/${appointmentId}/messages`)
          .set('Cookie', cookie)
          .send({ body: 'One more thing' });

        expect(refused.status).toBe(400);
        expect(JSON.stringify(refused.body)).toContain('read-only');
      }

      // The transcript is still readable — it is the record of what was said.
      const context = await ctx.http
        .get(`/api/consultations/${appointmentId}`)
        .set('Cookie', doctor.cookie);
      expect(context.body.messages).toHaveLength(1);
    });
  });
});
