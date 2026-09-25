import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';
import { createAdmin, createApprovedDoctor, createDoctor, createPatient, ctxOf } from './fixtures';
import type { Ctx } from './fixtures';

/**
 * Oversight, and the boundaries around it.
 *
 * The audit rule is the interesting one: the log records what an administrator
 * *changed*, not what they looked at. Both halves of that are asserted, because
 * a log that recorded reads would be as wrong as one that missed writes.
 */

const ADMIN_ROUTES = [
  { method: 'get' as const, path: '/api/admin/users' },
  { method: 'get' as const, path: '/api/admin/doctors/pending' },
  { method: 'get' as const, path: '/api/admin/appointments' },
  { method: 'get' as const, path: '/api/admin/stats' },
  { method: 'get' as const, path: '/api/admin/audit' },
];

describe('administration', () => {
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

  describe('access', () => {
    it.each(ADMIN_ROUTES)('refuses a non-administrator $method $path', async ({ method, path }) => {
      const patient = await createPatient(ctx);
      const doctor = await createApprovedDoctor(ctx);

      expect((await ctx.http[method](path).set('Cookie', patient.cookie)).status).toBe(403);
      expect((await ctx.http[method](path).set('Cookie', doctor.cookie)).status).toBe(403);
    });

    it('admits an administrator', async () => {
      const admin = await createAdmin(ctx);

      for (const { method, path } of ADMIN_ROUTES) {
        const response = await ctx.http[method](path).set('Cookie', admin.cookie);
        expect(response.status, path).toBe(200);
      }
    });
  });

  describe('account status', () => {
    it('suspends an account and records why', async () => {
      const patient = await createPatient(ctx);
      const admin = await createAdmin(ctx);

      const suspended = await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Abusive behaviour reported' });

      expect(suspended.status).toBe(201);
      expect(suspended.body.status).toBe('SUSPENDED');
      expect(suspended.body.statusReason).toBe('Abusive behaviour reported');
    });

    it('requires a reason to suspend, and none to activate', async () => {
      const patient = await createPatient(ctx);
      const admin = await createAdmin(ctx);

      const withoutReason = await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({});
      expect(withoutReason.status).toBe(400);

      const activated = await ctx.http
        .post(`/api/admin/users/${patient.userId}/activate`)
        .set('Cookie', admin.cookie);
      expect(activated.status).toBe(201);
      expect(activated.body.status).toBe('ACTIVE');
    });

    it('clears a previous reason when an account is activated', async () => {
      const patient = await createPatient(ctx);
      const admin = await createAdmin(ctx);

      await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Under review' });
      const reactivated = await ctx.http
        .post(`/api/admin/users/${patient.userId}/activate`)
        .set('Cookie', admin.cookie);

      // A reactivated account must not carry a stale explanation with it.
      expect(reactivated.body.statusReason).toBeNull();
    });

    it('refuses to change another administrator’s account', async () => {
      const admin = await createAdmin(ctx);
      const other = await createAdmin(ctx);

      const refused = await ctx.http
        .post(`/api/admin/users/${other.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Trying to suspend an administrator' });

      expect(refused.status).toBe(400);
      const stillActive = await ctx.prisma.user.findUniqueOrThrow({ where: { id: other.userId } });
      expect(stillActive.status).toBe('ACTIVE');
    });
  });

  describe('doctor approval', () => {
    it('lists pending applications and approves one', async () => {
      const doctor = await createDoctor(ctx);
      const admin = await createAdmin(ctx);

      const queue = await ctx.http.get('/api/admin/doctors/pending').set('Cookie', admin.cookie);
      expect(queue.body.map((d: { id: string }) => d.id)).toContain(doctor.profileId);

      const approved = await ctx.http
        .post(`/api/admin/doctors/${doctor.profileId}/approve`)
        .set('Cookie', admin.cookie);
      expect(approved.status).toBe(204);

      const directory = await ctx.http.get('/api/doctors').set('Cookie', admin.cookie);
      expect(directory.body.map((d: { id: string }) => d.id)).toContain(doctor.profileId);
    });

    it('requires a reason to reject, and keeps the doctor out of the directory', async () => {
      const doctor = await createDoctor(ctx);
      const admin = await createAdmin(ctx);

      const withoutReason = await ctx.http
        .post(`/api/admin/doctors/${doctor.profileId}/reject`)
        .set('Cookie', admin.cookie)
        .send({});
      expect(withoutReason.status).toBe(400);

      const rejected = await ctx.http
        .post(`/api/admin/doctors/${doctor.profileId}/reject`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'License could not be verified' });
      expect(rejected.status).toBe(204);

      const directory = await ctx.http.get('/api/doctors').set('Cookie', admin.cookie);
      expect(directory.body.map((d: { id: string }) => d.id)).not.toContain(doctor.profileId);
    });

    it('leaves a rejected doctor rejected when they edit their profile', async () => {
      const doctor = await createDoctor(ctx);
      const admin = await createAdmin(ctx);

      await ctx.http
        .post(`/api/admin/doctors/${doctor.profileId}/reject`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'License could not be verified' });

      const edited = await ctx.http
        .patch('/api/doctors/me')
        .set('Cookie', doctor.cookie)
        .send({ bio: 'Updated biography with the correct details.' });
      expect(edited.status).toBe(200);

      // Editing does not resubmit: nothing returns a rejected profile to the
      // queue, which is why the rejection reason is still there and the
      // approval state has not moved.
      const mine = await ctx.http.get('/api/doctors/me').set('Cookie', doctor.cookie);
      expect(mine.body.approvalState).toBe('REJECTED');
      expect(mine.body.rejectionReason).toBe('License could not be verified');
    });
  });

  describe('the audit log', () => {
    it('records a change, with the administrator who made it and why', async () => {
      const patient = await createPatient(ctx);
      const admin = await createAdmin(ctx);

      await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Under review' });

      const log = await ctx.http.get('/api/admin/audit').set('Cookie', admin.cookie);

      const entry = (log.body as Array<Record<string, string>>).find(
        (row) => row.action === 'ACCOUNT_SUSPENDED',
      );
      expect(entry).toBeDefined();
      expect(entry?.actorId).toBe(admin.userId);
      expect(entry?.targetId).toBe(patient.userId);
      expect(entry?.reason).toBe('Under review');
    });

    it('records nothing for reading', async () => {
      const admin = await createAdmin(ctx);

      // Read everything the admin surface offers.
      for (const { method, path } of ADMIN_ROUTES) {
        await ctx.http[method](path).set('Cookie', admin.cookie);
      }

      // The log records changes, not attention. A log of page views would be
      // large, would say very little, and would bury the entries that matter.
      expect(await ctx.prisma.auditLog.count()).toBe(0);
    });

    it('records an approval and a rejection', async () => {
      const first = await createDoctor(ctx);
      const second = await createDoctor(ctx);
      const admin = await createAdmin(ctx);

      await ctx.http
        .post(`/api/admin/doctors/${first.profileId}/approve`)
        .set('Cookie', admin.cookie);
      await ctx.http
        .post(`/api/admin/doctors/${second.profileId}/reject`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'License could not be verified' });

      const actions = await ctx.prisma.auditLog.findMany();
      expect(actions.map((row) => row.action).sort()).toEqual(['DOCTOR_APPROVED', 'DOCTOR_REJECTED']);
    });

    it('is insert-only, with no way to change an entry', async () => {
      const admin = await createAdmin(ctx);
      const patient = await createPatient(ctx);
      await ctx.http
        .post(`/api/admin/users/${patient.userId}/suspend`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Under review' });

      const entry = await ctx.prisma.auditLog.findFirstOrThrow();

      // No route offers either, so the guarantee is the absence.
      expect((await ctx.http.delete(`/api/admin/audit/${entry.id}`).set('Cookie', admin.cookie)).status).toBe(404);
      expect((await ctx.http.put(`/api/admin/audit/${entry.id}`).set('Cookie', admin.cookie)).status).toBe(404);
      expect(await ctx.prisma.auditLog.count()).toBe(1);
    });
  });

  describe('the patient’s own profile', () => {
    it('scopes reads to the caller', async () => {
      const mine = await createPatient(ctx, { fullName: 'First Person' });
      const theirs = await createPatient(ctx, { fullName: 'Second Person' });

      const profile = await ctx.http.get('/api/patients/me/profile').set('Cookie', mine.cookie);

      expect(profile.status).toBe(200);
      expect(profile.body.id).toBe(mine.profileId);
      expect(profile.body.fullName).toBe('First Person');
      expect(profile.body.id).not.toBe(theirs.profileId);
    });

    it('scopes writes to the caller', async () => {
      const mine = await createPatient(ctx);
      const theirs = await createPatient(ctx);

      await ctx.http
        .patch('/api/patients/me/profile')
        .set('Cookie', mine.cookie)
        .send({ contactNumber: '+63 900 000 0000' });

      const theirProfile = await ctx.prisma.patientProfile.findUniqueOrThrow({
        where: { id: theirs.profileId },
      });
      expect(theirProfile.contactNumber).not.toBe('+63 900 000 0000');
    });

    it('refuses to remove a history entry belonging to another patient', async () => {
      const mine = await createPatient(ctx);
      const theirs = await createPatient(ctx);

      const added = await ctx.http
        .post('/api/patients/me/history')
        .set('Cookie', theirs.cookie)
        .send({ kind: 'ALLERGY', description: 'Penicillin' });
      expect(added.status).toBe(201);

      const refused = await ctx.http
        .delete(`/api/patients/me/history/${added.body.id}`)
        .set('Cookie', mine.cookie);

      // 404 rather than 403: an entry belonging to someone else must not be
      // distinguishable from one that does not exist.
      expect(refused.status).toBe(404);
      expect(await ctx.prisma.medicalHistoryEntry.count()).toBe(1);
    });
  });
});
