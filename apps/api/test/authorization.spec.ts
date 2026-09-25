import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';
import {
  bookAppointment,
  completeConsultation,
  createAdmin,
  createApprovedDoctor,
  createPatient,
  ctxOf,
  giveFullWeekAvailability,
} from './fixtures';
import type { Ctx } from './fixtures';

/**
 * Who may call what.
 *
 * Authentication is applied to the whole application and opted out of per
 * route, so the property under test is deny-by-default: a route is protected
 * unless its author said otherwise. The table below is the whole non-public
 * surface, not a sample — a new route that forgets its guard would appear here
 * as a 200 rather than a 401.
 */

interface Route {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
}

const NON_PUBLIC_ROUTES: Route[] = [
  { method: 'post', path: '/api/auth/logout' },
  { method: 'get', path: '/api/auth/me' },

  { method: 'get', path: '/api/patients/me/profile' },
  { method: 'patch', path: '/api/patients/me/profile' },
  { method: 'post', path: '/api/patients/me/history' },
  { method: 'delete', path: '/api/patients/me/history/some-id' },

  { method: 'get', path: '/api/doctors/me' },
  { method: 'patch', path: '/api/doctors/me' },
  { method: 'get', path: '/api/doctors' },
  { method: 'get', path: '/api/doctors/some-id' },
  { method: 'get', path: '/api/doctors/some-id/slots' },

  { method: 'get', path: '/api/availability/windows' },
  { method: 'post', path: '/api/availability/windows' },
  { method: 'delete', path: '/api/availability/windows/some-id' },
  { method: 'get', path: '/api/availability/exceptions' },
  { method: 'post', path: '/api/availability/exceptions' },
  { method: 'delete', path: '/api/availability/exceptions/some-id' },
  { method: 'get', path: '/api/availability/slots' },

  { method: 'get', path: '/api/appointments' },
  { method: 'get', path: '/api/appointments/some-id' },
  { method: 'post', path: '/api/appointments' },
  { method: 'post', path: '/api/appointments/some-id/reschedule' },
  { method: 'post', path: '/api/appointments/some-id/cancel' },

  { method: 'get', path: '/api/consultations/some-id' },
  { method: 'post', path: '/api/consultations/some-id/join' },
  { method: 'post', path: '/api/consultations/some-id/complete' },
  { method: 'post', path: '/api/consultations/some-id/messages' },

  { method: 'get', path: '/api/records/me' },
  { method: 'get', path: '/api/records/patients/some-id' },
  { method: 'get', path: '/api/records/appointments/some-id' },
  { method: 'get', path: '/api/records/assist' },
  { method: 'get', path: '/api/records/appointments/some-id/draft' },
  { method: 'post', path: '/api/records/appointments/some-id/draft' },
  { method: 'put', path: '/api/records/appointments/some-id/note' },
  { method: 'post', path: '/api/records/appointments/some-id/prescriptions' },

  { method: 'get', path: '/api/matching/symptoms' },
  { method: 'post', path: '/api/matching' },

  { method: 'get', path: '/api/admin/users' },
  { method: 'post', path: '/api/admin/users/some-id/activate' },
  { method: 'post', path: '/api/admin/users/some-id/suspend' },
  { method: 'post', path: '/api/admin/users/some-id/deactivate' },
  { method: 'get', path: '/api/admin/doctors/pending' },
  { method: 'post', path: '/api/admin/doctors/some-id/approve' },
  { method: 'post', path: '/api/admin/doctors/some-id/reject' },
  { method: 'post', path: '/api/admin/doctors/some-id/specializations' },
  { method: 'get', path: '/api/admin/appointments' },
  { method: 'post', path: '/api/admin/appointments/some-id/cancel' },
  { method: 'get', path: '/api/admin/stats' },
  { method: 'get', path: '/api/admin/audit' },

  { method: 'get', path: '/api/notifications' },
  { method: 'get', path: '/api/notifications/unread-count' },
  { method: 'get', path: '/api/notifications/reminders' },
  { method: 'post', path: '/api/notifications/some-id/read' },
  { method: 'post', path: '/api/notifications/read-all' },
];

const PUBLIC_ROUTES: Route[] = [
  { method: 'post', path: '/api/auth/register/patient' },
  { method: 'post', path: '/api/auth/register/doctor' },
  { method: 'post', path: '/api/auth/login' },
  { method: 'get', path: '/api/health' },
];

describe('authorization', () => {
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

  describe('authentication is required by default', () => {
    it.each(NON_PUBLIC_ROUTES)(
      'refuses an unauthenticated $method $path',
      async ({ method, path }) => {
        const response = await ctx.http[method](path);

        expect(response.status).toBe(401);
      },
    );

    it.each(PUBLIC_ROUTES)('does not require a session for $method $path', async ({ method, path }) => {
      const response = await ctx.http[method](path).send({});

      // Registration and sign-in refuse an empty body, and health answers — the
      // point is that none of them answers 401.
      expect(response.status).not.toBe(401);
    });
  });

  describe('role gates', () => {
    it('refuses a patient the administrator surface', async () => {
      const patient = await createPatient(ctx);

      const response = await ctx.http.get('/api/admin/stats').set('Cookie', patient.cookie);

      expect(response.status).toBe(403);
    });

    it('refuses a patient the doctor-only surfaces', async () => {
      const patient = await createPatient(ctx);

      for (const path of [
        '/api/doctors/me',
        '/api/availability/windows',
        '/api/records/appointments/some-id/draft',
      ]) {
        const response = await ctx.http.get(path).set('Cookie', patient.cookie);
        expect(response.status, path).toBe(403);
      }
    });

    it('refuses a doctor the patient-only surfaces', async () => {
      const doctor = await createApprovedDoctor(ctx);

      for (const path of ['/api/patients/me/profile', '/api/matching/symptoms']) {
        const response = await ctx.http.get(path).set('Cookie', doctor.cookie);
        expect(response.status, path).toBe(403);
      }

      const booking = await ctx.http
        .post('/api/appointments')
        .set('Cookie', doctor.cookie)
        .send({ doctorId: doctor.profileId, startsAt: new Date().toISOString(), reasonForVisit: 'nope' });
      expect(booking.status).toBe(403);
    });

    it('refuses a doctor completing a consultation as a patient would', async () => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      // The route is open to both roles; it is the service that refuses a
      // non-doctor. Covered in full under consultations — pinned here so the
      // route-level gate and the service-level rule are not confused.
      const response = await ctx.http
        .post(`/api/consultations/${appointment.id}/complete`)
        .set('Cookie', patient.cookie);

      expect(response.status).toBe(403);
    });

    it('refuses an administrator the role-restricted surfaces', async () => {
      const admin = await createAdmin(ctx);

      for (const path of ['/api/doctors/me', '/api/matching/symptoms', '/api/patients/me/profile']) {
        const response = await ctx.http.get(path).set('Cookie', admin.cookie);
        expect(response.status, path).toBe(403);
      }
    });
  });

  describe('ownership', () => {
    it('answers a non-participant exactly as it answers a missing appointment', async () => {
      const patient = await createPatient(ctx);
      const stranger = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const asStranger = await ctx.http
        .get(`/api/appointments/${appointment.id}`)
        .set('Cookie', stranger.cookie);
      const asNobody = await ctx.http
        .get('/api/appointments/does-not-exist-at-all')
        .set('Cookie', stranger.cookie);

      expect(asStranger.status).toBe(404);
      // Not 403: a refusal that distinguishes "not yours" from "no such thing"
      // confirms the record exists, which is the disclosure the rule prevents.
      expect(asStranger.body).toEqual(asNobody.body);
    });

    it('answers a non-participant exactly as it answers a missing consultation', async () => {
      const patient = await createPatient(ctx);
      const stranger = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);

      const asStranger = await ctx.http
        .get(`/api/consultations/${appointment.id}`)
        .set('Cookie', stranger.cookie);
      const asNobody = await ctx.http
        .get('/api/consultations/does-not-exist-at-all')
        .set('Cookie', stranger.cookie);

      expect(asStranger.status).toBe(404);
      expect(asStranger.body).toEqual(asNobody.body);
    });

    it('answers a non-participant exactly as it answers a missing record entry', async () => {
      const patient = await createPatient(ctx);
      const stranger = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);
      await giveFullWeekAvailability(ctx, doctor.cookie);
      const appointment = await bookAppointment(ctx, patient, doctor.profileId);
      await completeConsultation(ctx, patient, doctor, appointment.id);

      const asStranger = await ctx.http
        .get(`/api/records/appointments/${appointment.id}`)
        .set('Cookie', stranger.cookie);
      const asNobody = await ctx.http
        .get('/api/records/appointments/does-not-exist-at-all')
        .set('Cookie', stranger.cookie);

      expect(asStranger.status).toBe(404);
      expect(asStranger.body).toEqual(asNobody.body);
    });
  });

  describe('account status', () => {
    it('refuses a suspended account on its next request, with a session that has not expired', async () => {
      const patient = await createPatient(ctx);
      const admin = await createAdmin(ctx);

      // The session works now.
      expect((await ctx.http.get('/api/auth/me').set('Cookie', patient.cookie)).status).toBe(200);

      const suspended = await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Testing the suspension path' });
      // 201 is Nest's default for POST, and what the generated API description
      // now states for every route that does not set @HttpCode.
      expect(suspended.status).toBe(201);

      // Same cookie, no new sign-in: the guard re-reads the account on every
      // request, which is what makes suspension immediate rather than waiting
      // for the token to expire.
      const after = await ctx.http.get('/api/auth/me').set('Cookie', patient.cookie);
      expect(after.status).toBe(403);
    });
  });
});
