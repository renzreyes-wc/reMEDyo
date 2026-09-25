import { SESSION_COOKIE_NAME } from '@remedyo/shared';
import argon2 from 'argon2';
import type { SuperTest, Test as SuperTestRequest } from 'supertest';
import { PrismaService } from '../src/common/prisma.service';
import type { TestApp } from './harness';

/**
 * Builders for the states the behavioural tests need.
 *
 * Accounts are created through the API wherever a route exists for it, because
 * the point is to arrive at a state the way the application would. Two things
 * have no route and are written directly: an administrator account is
 * provisioned rather than registered, and approving a doctor is a fixture here
 * rather than an admin action, because the admin routes have their own tests
 * and a fixture that went through them would fail for their reasons.
 *
 * Emails are unique per call, so a fixture never collides with another even if
 * a test forgets to reset.
 */

export const PASSWORD = 'test-password-123';

let sequence = 0;
const nextEmail = (role: string): string =>
  `${role}-${Date.now()}-${sequence++}@example.test`;

export interface Ctx {
  http: SuperTest<SuperTestRequest>;
  prisma: PrismaService;
}

export function ctxOf(testApp: TestApp): Ctx {
  return { http: testApp.http, prisma: testApp.app.get(PrismaService) };
}

/** Turns a response's Set-Cookie header into the value a Cookie header wants. */
export function cookieOf(response: { headers: Record<string, unknown> }): string {
  const raw = response.headers['set-cookie'];
  const cookies = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : [];
  const session = cookies.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));

  if (!session) {
    throw new Error('That response set no session cookie — did the request sign in?');
  }

  return session.split(';')[0];
}

export interface Patient {
  userId: string;
  profileId: string;
  email: string;
  cookie: string;
}

export interface Doctor {
  userId: string;
  profileId: string;
  email: string;
  cookie: string;
}

/**
 * A patient with a complete profile, because booking requires a name and a date
 * of birth — a fixture that omitted them would make every booking test fail for
 * a reason unrelated to what it is testing.
 */
export async function createPatient(
  ctx: Ctx,
  options: { fullName?: string; dateOfBirth?: string } = {},
): Promise<Patient> {
  const email = nextEmail('patient');

  const registered = await ctx.http.post('/api/auth/register/patient').send({
    email,
    password: PASSWORD,
    fullName: options.fullName ?? 'Pat Testpatient',
  });

  if (registered.status !== 201) {
    throw new Error(`Patient registration failed: ${registered.status} ${JSON.stringify(registered.body)}`);
  }

  const cookie = cookieOf(registered);

  const profile = await ctx.http
    .patch('/api/patients/me/profile')
    .set('Cookie', cookie)
    .send({ dateOfBirth: options.dateOfBirth ?? '1990-05-04' });

  if (profile.status !== 200) {
    throw new Error(`Patient profile update failed: ${profile.status} ${JSON.stringify(profile.body)}`);
  }

  const userId = registered.body.id as string;
  const row = await ctx.prisma.patientProfile.findUniqueOrThrow({ where: { userId } });

  return { userId, profileId: row.id, email, cookie };
}

/** A doctor who has registered and is therefore awaiting approval. */
export async function createDoctor(
  ctx: Ctx,
  options: { fullName?: string; specializations?: string[] } = {},
): Promise<Doctor> {
  const email = nextEmail('doctor');

  const registered = await ctx.http.post('/api/auth/register/doctor').send({
    email,
    password: PASSWORD,
    fullName: options.fullName ?? 'Dr Testdoctor',
    specializations: options.specializations ?? ['GENERAL_PRACTICE'],
    licenseNumber: `LIC-${Date.now()}`,
    yearsExperience: 8,
  });

  if (registered.status !== 201) {
    throw new Error(`Doctor registration failed: ${registered.status} ${JSON.stringify(registered.body)}`);
  }

  const userId = registered.body.id as string;
  const row = await ctx.prisma.doctorProfile.findUniqueOrThrow({ where: { userId } });

  return { userId, profileId: row.id, email, cookie: cookieOf(registered) };
}

/**
 * Puts a registered doctor into the directory.
 *
 * Written directly rather than through the admin route: approval has its own
 * tests, and a fixture that depended on them would report their failures as
 * every other test's.
 */
export async function approveDoctor(ctx: Ctx, profileId: string): Promise<void> {
  await ctx.prisma.doctorProfile.update({
    where: { id: profileId },
    data: { approvalState: 'APPROVED', reviewedAt: new Date() },
  });
}

/** A doctor who is registered and approved, in one call. */
export async function createApprovedDoctor(
  ctx: Ctx,
  options: { fullName?: string; specializations?: string[] } = {},
): Promise<Doctor> {
  const doctor = await createDoctor(ctx, options);
  await approveDoctor(ctx, doctor.profileId);
  return doctor;
}

/**
 * An administrator: provisioned rather than registered, so written directly and
 * signed in through the real login route to get a session.
 */
export async function createAdmin(ctx: Ctx): Promise<{ userId: string; email: string; cookie: string }> {
  const email = nextEmail('admin');

  const user = await ctx.prisma.user.create({
    data: { email, passwordHash: await argon2.hash(PASSWORD), role: 'ADMIN' },
  });

  const signedIn = await ctx.http.post('/api/auth/login').send({ email, password: PASSWORD });
  if (signedIn.status !== 200) {
    throw new Error(`Admin sign-in failed: ${signedIn.status} ${JSON.stringify(signedIn.body)}`);
  }

  return { userId: user.id, email, cookie: cookieOf(signedIn) };
}

/**
 * Gives a doctor a window on every weekday, 09:00 to 17:00 in their own local
 * time.
 *
 * All seven rather than one, so a test never has to reason about which weekday
 * a computed date falls on — and a dated exception still overrides a window,
 * which is what the tests that care about exceptions exercise.
 */
export async function giveFullWeekAvailability(ctx: Ctx, doctorCookie: string): Promise<void> {
  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const response = await ctx.http
      .post('/api/availability/windows')
      .set('Cookie', doctorCookie)
      .send({ dayOfWeek, startMinute: 9 * 60, endMinute: 17 * 60 });

    if (response.status !== 201) {
      throw new Error(
        `Adding an availability window failed: ${response.status} ${JSON.stringify(response.body)}`,
      );
    }
  }
}

/** The soonest slot the doctor is actually offering, read from the API. */
export async function firstBookableSlot(
  ctx: Ctx,
  doctorProfileId: string,
  cookie: string,
): Promise<string> {
  const response = await ctx.http.get(`/api/doctors/${doctorProfileId}/slots`).set('Cookie', cookie);

  if (response.status !== 200) {
    throw new Error(`Reading slots failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  const [slot] = response.body as Array<{ startsAt: string }>;
  if (!slot) {
    throw new Error('That doctor is offering no slots — did the fixture give them availability?');
  }

  return slot.startsAt;
}

/** Books an appointment for a patient, defaulting to the doctor's soonest slot. */
export async function bookAppointment(
  ctx: Ctx,
  patient: Patient,
  doctorProfileId: string,
  startsAt?: string,
): Promise<{ id: string; startsAt: string }> {
  const slot = startsAt ?? (await firstBookableSlot(ctx, doctorProfileId, patient.cookie));

  const response = await ctx.http
    .post('/api/appointments')
    .set('Cookie', patient.cookie)
    .send({ doctorId: doctorProfileId, startsAt: slot, reasonForVisit: 'A persistent cough' });

  if (response.status !== 201) {
    throw new Error(`Booking failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { id: response.body.id as string, startsAt: response.body.startsAt as string };
}

/**
 * Takes a booked appointment all the way to a completed consultation: both
 * parties join, then the doctor ends it.
 *
 * Completion is what every records write requires, so most of the records tests
 * start here.
 */
export async function completeConsultation(
  ctx: Ctx,
  patient: Patient,
  doctor: Doctor,
  appointmentId: string,
): Promise<void> {
  const joins = [
    { cookie: patient.cookie, who: 'patient' },
    { cookie: doctor.cookie, who: 'doctor' },
  ];

  for (const { cookie, who } of joins) {
    const joined = await ctx.http
      .post(`/api/consultations/${appointmentId}/join`)
      .set('Cookie', cookie);

    if (joined.status !== 201) {
      throw new Error(`${who} could not join: ${joined.status} ${JSON.stringify(joined.body)}`);
    }
  }

  const completed = await ctx.http
    .post(`/api/consultations/${appointmentId}/complete`)
    .set('Cookie', doctor.cookie);

  if (completed.status !== 201) {
    throw new Error(`Completion failed: ${completed.status} ${JSON.stringify(completed.body)}`);
  }
}

/** The whole path: a patient, an available approved doctor, a booking, completed. */
export async function completedConsultation(ctx: Ctx): Promise<{
  patient: Patient;
  doctor: Doctor;
  appointmentId: string;
}> {
  const patient = await createPatient(ctx);
  const doctor = await createApprovedDoctor(ctx);
  await giveFullWeekAvailability(ctx, doctor.cookie);

  const appointment = await bookAppointment(ctx, patient, doctor.profileId);
  await completeConsultation(ctx, patient, doctor, appointment.id);

  return { patient, doctor, appointmentId: appointment.id };
}
