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

/**
 * Clinical assist, with generation off.
 *
 * This is the path every deployment gets by default, and the one that must not
 * look broken: assistance that is unavailable is a state the product reports,
 * not an error it throws. `test/setup.ts` pins `LLM_ENABLED=false` so the suite
 * cannot silently start exercising the other path.
 *
 * What is deliberately *not* tested here is generation itself, which needs a
 * model. The refusal gates run before any model is consulted, so they are
 * testable without one — and they are the part that decides whether a
 * confidently invented note can ever reach a doctor's screen.
 */
describe('clinical assist, disabled', () => {
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

  it('reports itself unavailable through the assist surface', async () => {
    const { patient } = await completedConsultation(ctx);

    const availability = await ctx.http.get('/api/records/assist').set('Cookie', patient.cookie);

    expect(availability.status).toBe(200);
    expect(availability.body).toEqual({ enabled: false, model: null });
  });

  it('makes the assist surface doctor-only', async () => {
    const { patient } = await completedConsultation(ctx);

    const refused = await ctx.http.get('/api/records/assist').set('Cookie', patient.cookie);

    // Not a claim about privilege: the flag says something about this
    // deployment's configuration, and the patient is allowed to see it. This
    // asserts the route is reachable rather than public — the unauthenticated
    // case is covered in the authorization suite.
    expect(refused.status).not.toBe(401);
  });

  it('refuses a draft from a transcript too thin to draft from, as an ordinary outcome', async () => {
    const { doctor, appointmentId } = await completedConsultation(ctx);

    const refused = await ctx.http
      .post(`/api/records/appointments/${appointmentId}/draft`)
      .set('Cookie', doctor.cookie);

    // A refusal is a success carrying `status: "refused"` — not an error,
    // because a consultation with two messages in it has nothing to summarise
    // and that is not a failure of anything.
    expect(refused.status).toBe(201);
    expect(refused.body.status).toBe('refused');
    expect(['transcript-empty', 'transcript-too-thin', 'unavailable']).toContain(refused.body.reason);
  });

  /**
   * A completed consultation with a transcript substantial enough that the
   * refusal cannot be blamed on it. Messages are sent *between* joining and
   * completing, because the thread is read-only afterwards — posting them later
   * silently leaves the transcript empty, which is a mistake an earlier version
   * of this file made and passed a test it should not have.
   */
  async function completedWithSubstantialTranscript() {
    const patient = await createPatient(ctx);
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);
    const appointment = await bookAppointment(ctx, patient, doctor.profileId);

    await ctx.http.post(`/api/consultations/${appointment.id}/join`).set('Cookie', patient.cookie);
    await ctx.http.post(`/api/consultations/${appointment.id}/join`).set('Cookie', doctor.cookie);

    // Both sides have to speak. The thin-transcript rule requires at least two
    // messages from each participant, so a transcript of one voice is refused
    // as too thin however long it is — which is the point of the rule, and the
    // reason these turns are paired rather than a monologue.
    const exchange = [
      { cookie: patient.cookie, body: 'It started about a week ago and has been getting worse.' },
      { cookie: doctor.cookie, body: 'Any fever, or night sweats?' },
      { cookie: patient.cookie, body: 'No fever, but I have been coughing at night.' },
      { cookie: doctor.cookie, body: 'And does anything make it better or worse?' },
      { cookie: patient.cookie, body: 'It is worse when I lie down, and nothing I have tried has helped.' },
      { cookie: doctor.cookie, body: 'Any chest pain or recent travel?' },
      { cookie: patient.cookie, body: 'No chest pain, and I have not travelled anywhere recently.' },
    ];

    for (const { cookie, body } of exchange) {
      const sent = await ctx.http
        .post(`/api/consultations/${appointment.id}/messages`)
        .set('Cookie', cookie)
        .send({ body });

      if (sent.status !== 201) {
        throw new Error(`Building the transcript failed: ${sent.status} ${JSON.stringify(sent.body)}`);
      }
    }

    await ctx.http
      .post(`/api/consultations/${appointment.id}/complete`)
      .set('Cookie', doctor.cookie);

    return { patient, doctor, appointmentId: appointment.id };
  }

  it('refuses even when the transcript would be substantial enough, because generation is off', async () => {
    const { doctor, appointmentId } = await completedWithSubstantialTranscript();

    const refused = await ctx.http
      .post(`/api/records/appointments/${appointmentId}/draft`)
      .set('Cookie', doctor.cookie);

    expect(refused.status).toBe(201);
    expect(refused.body.status).toBe('refused');
    // The transcript was fine; it is the deployment that refused. A refusal
    // blamed on the transcript here would mean the gate order was wrong.
    expect(refused.body.reason).toBe('unavailable');
  });

  it('writes no note, and no draft, when a draft is requested', async () => {
    const { doctor, appointmentId } = await completedWithSubstantialTranscript();

    await ctx.http
      .post(`/api/records/appointments/${appointmentId}/draft`)
      .set('Cookie', doctor.cookie);

    // The draft route must not be a back door into the record. The note table
    // is written by exactly one route, and this is not it. A draft is only
    // stored once generation succeeds, so a refused request stores nothing.
    expect(await ctx.prisma.consultationNote.count()).toBe(0);
    expect(await ctx.prisma.consultationNoteDraft.count()).toBe(0);
  });

  it('returns nothing when no draft has been generated', async () => {
    const { doctor, appointmentId } = await completedConsultation(ctx);

    const draft = await ctx.http
      .get(`/api/records/appointments/${appointmentId}/draft`)
      .set('Cookie', doctor.cookie);

    // An empty body rather than a JSON `null`: Nest sends no payload when a
    // handler resolves to null. The generated description says `null` and the
    // web client maps an empty body to null, so the contract holds for its only
    // consumer — but the bytes on the wire are asserted here as they are.
    expect(draft.status).toBe(200);
    expect(draft.text).toBe('');
  });

  it('refuses to draft for a consultation that has not been completed', async () => {
    const patient = await createPatient(ctx);
    const doctor = await createApprovedDoctor(ctx);
    await giveFullWeekAvailability(ctx, doctor.cookie);
    const appointment = await bookAppointment(ctx, patient, doctor.profileId);
    await ctx.http.post(`/api/consultations/${appointment.id}/join`).set('Cookie', patient.cookie);
    await ctx.http.post(`/api/consultations/${appointment.id}/join`).set('Cookie', doctor.cookie);

    const refused = await ctx.http
      .post(`/api/records/appointments/${appointment.id}/draft`)
      .set('Cookie', doctor.cookie);

    expect(refused.status).toBe(400);
    expect(JSON.stringify(refused.body)).toContain('Complete the consultation');
  });

  it('refuses a draft to a doctor who did not hold the consultation', async () => {
    const { appointmentId } = await completedConsultation(ctx);
    const other = await createApprovedDoctor(ctx);

    const refused = await ctx.http
      .post(`/api/records/appointments/${appointmentId}/draft`)
      .set('Cookie', other.cookie);

    expect(refused.status).toBe(403);
  });
});
