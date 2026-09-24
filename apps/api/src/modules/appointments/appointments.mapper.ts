import { Prisma } from '@prisma/client';
import {
  MISSED_GRACE_MINUTES,
  type Appointment as AppointmentDto,
} from '@remedyo/shared';
import { initialsOf } from '../../common/initials';

export const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, fullName: true, userId: true } },
  doctor: {
    select: { id: true, fullName: true, userId: true, specializations: true },
  },
  session: { select: { state: true } },
  note: { select: { id: true } },
  _count: { select: { prescriptions: true } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRow = Prisma.AppointmentGetPayload<{
  include: typeof APPOINTMENT_INCLUDE;
}>;

export function toAppointmentDto(row: AppointmentRow): AppointmentDto {
  const missedAfter = new Date(
    row.endsAt.getTime() + MISSED_GRACE_MINUTES * 60_000,
  );

  return {
    id: row.id,
    patient: {
      id: row.patient.id,
      fullName: row.patient.fullName ?? 'Patient',
      initials: initialsOf(row.patient.fullName),
    },
    doctor: {
      id: row.doctor.id,
      fullName: row.doctor.fullName,
      initials: initialsOf(row.doctor.fullName),
      specializations: row.doctor.specializations,
    },
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    state: row.state,
    sessionState: row.session?.state ?? 'SCHEDULED',
    reasonForVisit: row.reasonForVisit,
    cancelledBy: row.cancelledBy,
    cancellationReason: row.cancellationReason,
    // Derived, never stored: a scheduled appointment whose time has passed
    // without completion reads as missed. Nothing sweeps the table, and the
    // label does not bar joining — it is late, not closed.
    missed: row.state === 'SCHEDULED' && missedAfter < new Date(),
    hasNote: row.note !== null,
    prescriptionCount: row._count.prescriptions,
  };
}
