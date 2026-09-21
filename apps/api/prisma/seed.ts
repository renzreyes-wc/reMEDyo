/**
 * Idempotent seed.
 *
 * A demo that opens on a populated dashboard reads as a product; one that opens
 * empty reads as a scaffold. So this is treated as a deliverable: on first boot
 * there are approved doctors with real availability, a doctor waiting in the
 * admin review queue, patients with history, and appointments in every state
 * the UI can show — including one already completed with notes and a
 * prescription attached, and one starting within the join window so the
 * consultation workspace can be demonstrated immediately.
 *
 * Every write is an upsert keyed on a stable identifier, so running this twice
 * changes no row counts.
 */

import {
  AppointmentState,
  CancelledBy,
  MedicalHistoryKind,
  NotificationType,
  PrismaClient,
  SessionState,
  Specialization,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { ADMIN_PASSWORD, DEMO_PASSWORD, SEED_DOCTORS, SEED_SYMPTOMS } from './seed-data';

const prisma = new PrismaClient();

const SLOT_MINUTES = 30;

/** Next occurrence of `hour:00` on a weekday, `daysAhead` days from now. */
function at(daysAhead: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function plusMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Nudges a date off weekends so seeded appointments land inside availability. */
function onWeekday(date: Date): Date {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

async function main(): Promise<void> {
  console.log('Seeding reMEDyo...');

  const [adminHash, demoHash] = await Promise.all([
    argon2.hash(ADMIN_PASSWORD),
    argon2.hash(DEMO_PASSWORD),
  ]);

  // --- Administrator -------------------------------------------------------
  // Pre-provisioned only. There is no public route that can create this.
  await prisma.user.upsert({
    where: { email: 'admin@remedyo.test' },
    update: {},
    create: {
      email: 'admin@remedyo.test',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // --- Symptom rules -------------------------------------------------------
  for (const symptom of SEED_SYMPTOMS) {
    for (const [specialization, weight] of Object.entries(symptom.weights)) {
      await prisma.symptomRule.upsert({
        where: {
          symptomId_specialization: {
            symptomId: symptom.symptomId,
            specialization: specialization as Specialization,
          },
        },
        update: { label: symptom.label, weight, emergency: symptom.emergency, keywords: symptom.keywords },
        create: {
          symptomId: symptom.symptomId,
          label: symptom.label,
          specialization: specialization as Specialization,
          weight: weight ?? 1,
          emergency: symptom.emergency,
          keywords: symptom.keywords,
        },
      });
    }
  }

  // --- Doctors -------------------------------------------------------------
  const doctorIdByKey = new Map<string, string>();

  for (const seed of SEED_DOCTORS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash: demoHash,
        role: 'DOCTOR',
        status: 'ACTIVE',
      },
    });

    const profile = await prisma.doctorProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: seed.fullName,
        specializations: seed.specializations,
        bio: seed.bio,
        yearsExperience: seed.yearsExperience,
        licenseNumber: seed.licenseNumber,
        consultationFee: seed.consultationFee,
        approvalState: seed.approved ? 'APPROVED' : 'PENDING',
        reviewedAt: seed.approved ? new Date() : null,
      },
      create: {
        userId: user.id,
        fullName: seed.fullName,
        specializations: seed.specializations,
        bio: seed.bio,
        yearsExperience: seed.yearsExperience,
        licenseNumber: seed.licenseNumber,
        consultationFee: seed.consultationFee,
        approvalState: seed.approved ? 'APPROVED' : 'PENDING',
        reviewedAt: seed.approved ? new Date() : null,
      },
    });

    doctorIdByKey.set(seed.key, profile.id);

    // Availability is replaced wholesale rather than diffed: it is derived
    // reference data, and replacing it keeps the seed trivially idempotent.
    await prisma.availabilityWindow.deleteMany({ where: { doctorId: profile.id } });
    await prisma.availabilityWindow.createMany({
      data: seed.availability.map((w) => ({ ...w, doctorId: profile.id })),
    });
  }

  // --- Patients ------------------------------------------------------------
  const patients = [
    {
      email: 'jose@remedyo.test',
      fullName: 'Jose Dela Cruz',
      dateOfBirth: new Date('1986-04-18'),
      contactNumber: '+63 917 555 0142',
      weightKg: 82.5,
      heightCm: 174,
      history: [
        { kind: MedicalHistoryKind.ALLERGY, description: 'Penicillin — rash and swelling' },
        { kind: MedicalHistoryKind.CONDITION, description: 'Hypertension, diagnosed 2021' },
        { kind: MedicalHistoryKind.MEDICATION, description: 'Losartan 50mg, once daily' },
        { kind: MedicalHistoryKind.NOTE, description: 'Father had a heart attack at 58.' },
      ],
    },
    {
      email: 'ana@remedyo.test',
      fullName: 'Ana Gonzales',
      dateOfBirth: new Date('1994-11-02'),
      contactNumber: '+63 918 555 0199',
      weightKg: 58,
      heightCm: 162,
      history: [
        { kind: MedicalHistoryKind.ALLERGY, description: 'Seasonal rhinitis — dust and pollen' },
        { kind: MedicalHistoryKind.CONDITION, description: 'Mild eczema on hands' },
      ],
    },
    {
      email: 'ramon@remedyo.test',
      fullName: 'Ramon Torres',
      dateOfBirth: new Date('1979-07-25'),
      contactNumber: '+63 919 555 0177',
      weightKg: 91,
      heightCm: 180,
      history: [
        { kind: MedicalHistoryKind.CONDITION, description: 'Type 2 diabetes, diagnosed 2019' },
        { kind: MedicalHistoryKind.MEDICATION, description: 'Metformin 500mg, twice daily' },
      ],
    },
  ];

  const patientIdByEmail = new Map<string, string>();

  for (const p of patients) {
    const user = await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { email: p.email, passwordHash: demoHash, role: 'PATIENT', status: 'ACTIVE' },
    });

    const profile = await prisma.patientProfile.upsert({
      where: { userId: user.id },
      update: {
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        contactNumber: p.contactNumber,
        weightKg: p.weightKg,
        heightCm: p.heightCm,
      },
      create: {
        userId: user.id,
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        contactNumber: p.contactNumber,
        weightKg: p.weightKg,
        heightCm: p.heightCm,
      },
    });

    patientIdByEmail.set(p.email, profile.id);

    await prisma.medicalHistoryEntry.deleteMany({ where: { patientId: profile.id } });
    await prisma.medicalHistoryEntry.createMany({
      data: p.history.map((h) => ({ ...h, patientId: profile.id })),
    });
  }

  // --- Appointments --------------------------------------------------------
  // Fixed ids so re-seeding updates rather than duplicates. Times are relative
  // to now, so the imminent appointment stays demonstrable on every re-seed.
  const jose = patientIdByEmail.get('jose@remedyo.test')!;
  const ana = patientIdByEmail.get('ana@remedyo.test')!;
  const ramon = patientIdByEmail.get('ramon@remedyo.test')!;

  const completedAt = onWeekday(at(-6, 10));
  const imminentAt = plusMinutes(new Date(new Date().setSeconds(0, 0)), 10);
  const upcomingAt = onWeekday(at(3, 14));
  const upcomingAt2 = onWeekday(at(5, 9, 30));
  const cancelledAt = onWeekday(at(2, 11));

  const appointments = [
    {
      id: 'seed_appt_completed',
      patientId: jose,
      doctorId: doctorIdByKey.get('cruz')!,
      startsAt: completedAt,
      reasonForVisit: 'Blood pressure has been running high at home for two weeks.',
      state: AppointmentState.COMPLETED,
      sessionState: SessionState.COMPLETED,
      note: {
        findings:
          'Home readings averaging 148/94 over fourteen days. No chest pain, no breathlessness on exertion. Currently on Losartan 50mg once daily, taken in the morning, good adherence.',
        diagnosis: 'Essential hypertension, inadequately controlled on current monotherapy.',
        recommendations:
          'Increase Losartan to 100mg once daily. Reduce added salt, and keep a home reading log twice daily for three weeks. Return sooner if readings exceed 160/100 or any chest pain develops.',
        followUp: 'Follow-up teleconsultation in three weeks with the reading log.',
      },
      prescriptions: [
        {
          medication: 'Losartan',
          dosage: '100 mg',
          frequency: 'Once daily, in the morning',
          durationDays: 30,
          instructions: 'Take with or without food. Do not stop abruptly.',
        },
      ],
      messages: [
        { from: 'patient', body: 'Good morning doctor, I have my readings written down here.' },
        { from: 'doctor', body: 'Perfect, that is exactly what I need. What is the highest you recorded?' },
        { from: 'patient', body: '156 over 98, last Tuesday evening after work.' },
      ],
    },
    {
      // Starts inside the join window, so the consultation workspace is
      // immediately demonstrable on a fresh boot.
      id: 'seed_appt_imminent',
      patientId: ana,
      doctorId: doctorIdByKey.get('reyes')!,
      startsAt: imminentAt,
      reasonForVisit: 'Eczema on both hands has flared badly over the last ten days.',
      state: AppointmentState.SCHEDULED,
      sessionState: SessionState.SCHEDULED,
    },
    {
      id: 'seed_appt_upcoming',
      patientId: jose,
      doctorId: doctorIdByKey.get('santos')!,
      startsAt: upcomingAt,
      reasonForVisit: 'Annual check-up and review of blood pressure medication.',
      state: AppointmentState.SCHEDULED,
      sessionState: SessionState.SCHEDULED,
    },
    {
      id: 'seed_appt_upcoming_2',
      patientId: ramon,
      doctorId: doctorIdByKey.get('mendoza')!,
      startsAt: upcomingAt2,
      reasonForVisit: 'Blood sugar has been unstable since changing shifts at work.',
      state: AppointmentState.SCHEDULED,
      sessionState: SessionState.SCHEDULED,
    },
    {
      id: 'seed_appt_cancelled',
      patientId: ana,
      doctorId: doctorIdByKey.get('lim')!,
      startsAt: cancelledAt,
      reasonForVisit: 'Trouble sleeping and constant worry about work.',
      state: AppointmentState.CANCELLED,
      sessionState: SessionState.SCHEDULED,
      cancelledBy: CancelledBy.PATIENT,
      cancellationReason: 'Work conflict — will rebook next week.',
    },
  ];

  for (const a of appointments) {
    const endsAt = plusMinutes(a.startsAt, SLOT_MINUTES);

    const base = {
      patientId: a.patientId,
      doctorId: a.doctorId,
      startsAt: a.startsAt,
      endsAt,
      state: a.state,
      reasonForVisit: a.reasonForVisit,
      cancelledBy: a.cancelledBy ?? null,
      cancellationReason: a.cancellationReason ?? null,
      cancelledAt: a.cancelledBy ? new Date() : null,
    };

    await prisma.appointment.upsert({
      where: { id: a.id },
      update: base,
      create: { id: a.id, ...base },
    });

    await prisma.consultationSession.upsert({
      where: { appointmentId: a.id },
      update: { state: a.sessionState },
      create: {
        appointmentId: a.id,
        state: a.sessionState,
        patientJoinedAt: a.sessionState === SessionState.COMPLETED ? a.startsAt : null,
        doctorJoinedAt: a.sessionState === SessionState.COMPLETED ? a.startsAt : null,
        startedAt: a.sessionState === SessionState.COMPLETED ? a.startsAt : null,
        completedAt: a.sessionState === SessionState.COMPLETED ? endsAt : null,
      },
    });

    if (a.note) {
      await prisma.consultationNote.upsert({
        where: { appointmentId: a.id },
        update: a.note,
        create: { appointmentId: a.id, ...a.note },
      });
    }

    if (a.prescriptions) {
      await prisma.prescription.deleteMany({ where: { appointmentId: a.id } });
      await prisma.prescription.createMany({
        data: a.prescriptions.map((p) => ({ ...p, appointmentId: a.id })),
      });
    }

    if (a.messages) {
      const patientUser = await prisma.patientProfile.findUnique({
        where: { id: a.patientId },
        select: { userId: true },
      });
      const doctorUser = await prisma.doctorProfile.findUnique({
        where: { id: a.doctorId },
        select: { userId: true },
      });

      await prisma.message.deleteMany({ where: { appointmentId: a.id } });
      await prisma.message.createMany({
        data: a.messages.map((m, i) => ({
          appointmentId: a.id,
          senderId: m.from === 'patient' ? patientUser!.userId : doctorUser!.userId,
          body: m.body,
          sentAt: plusMinutes(a.startsAt, i * 2),
        })),
      });
    }
  }

  // --- A couple of notifications so the bell is not empty on first login ----
  const joseUser = await prisma.patientProfile.findUnique({
    where: { id: jose },
    select: { userId: true },
  });

  await prisma.notification.deleteMany({
    where: { userId: joseUser!.userId, type: NotificationType.RECORDS_AVAILABLE },
  });
  await prisma.notification.create({
    data: {
      userId: joseUser!.userId,
      type: NotificationType.RECORDS_AVAILABLE,
      title: 'Your consultation record is ready',
      body: 'Dr. Antonio Cruz recorded notes and a prescription from your consultation.',
      link: '/patient/records',
    },
  });

  const counts = {
    users: await prisma.user.count(),
    doctors: await prisma.doctorProfile.count(),
    patients: await prisma.patientProfile.count(),
    appointments: await prisma.appointment.count(),
    symptomRules: await prisma.symptomRule.count(),
    availability: await prisma.availabilityWindow.count(),
  };

  console.log('Seed complete:', counts);
  console.log(`\n  Admin    admin@remedyo.test / ${ADMIN_PASSWORD}`);
  console.log(`  Patient  jose@remedyo.test  / ${DEMO_PASSWORD}`);
  console.log(`  Doctor   dr.cruz@remedyo.test / ${DEMO_PASSWORD}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
