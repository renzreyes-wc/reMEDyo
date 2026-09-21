import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CancelledBy, Prisma, Role } from '@prisma/client';
import { SLOT_DURATION_MINUTES, type Appointment as AppointmentDto } from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/types';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  APPOINTMENT_INCLUDE,
  toAppointmentDto,
  type AppointmentRow,
} from './appointments.mapper';
import {
  BookAppointmentDto,
  CancelAppointmentDto,
  RescheduleAppointmentDto,
} from './dto/appointments.dto';

/** Postgres unique-violation, raised by the partial index on active slots. */
const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
    private readonly notifications: NotificationsService,
  ) {}

  async book(user: AuthUser, dto: BookAppointmentDto): Promise<AppointmentDto> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    // The patient-profile spec gates booking on the required fields.
    if (!patient.fullName || !patient.dateOfBirth) {
      throw new BadRequestException(
        'Add your name and date of birth to your profile before booking.',
      );
    }

    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { id: dto.doctorId, approvalState: 'APPROVED' },
      include: { user: { select: { id: true, status: true } } },
    });
    if (!doctor || doctor.user.status !== 'ACTIVE') {
      throw new NotFoundException('That doctor is not available for booking.');
    }

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('Choose a valid time slot.');
    }
    if (startsAt <= new Date()) {
      throw new BadRequestException('That time has already passed.');
    }

    // The slot must be one the doctor actually offers — inside a window, not
    // on a blocked date, and aligned to the slot grid.
    const offered = await this.availability.slotsFor(doctor.id);
    if (!offered.some((s) => new Date(s.startsAt).getTime() === startsAt.getTime())) {
      throw new ConflictException('That slot is no longer available.');
    }

    const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60_000);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const appointment = await tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            startsAt,
            endsAt,
            reasonForVisit: dto.reasonForVisit.trim(),
            state: 'SCHEDULED',
            session: { create: { state: 'SCHEDULED' } },
          },
          include: APPOINTMENT_INCLUDE,
        });

        await this.notifications.emit(tx, [
          {
            userId: doctor.user.id,
            type: 'APPOINTMENT_BOOKED',
            title: 'New consultation booked',
            body: `${patient.fullName} booked a consultation for ${formatWhen(startsAt)}.`,
            link: `/doctor/appointments`,
          },
          {
            userId: user.id,
            type: 'APPOINTMENT_BOOKED',
            title: 'Consultation confirmed',
            body: `Your consultation with Dr. ${doctor.fullName} is set for ${formatWhen(startsAt)}.`,
            link: `/patient/appointments`,
          },
        ]);

        return appointment;
      });

      return toAppointmentDto(created);
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  async reschedule(
    user: AuthUser,
    appointmentId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentDto> {
    const appointment = await this.loadForParticipant(user, appointmentId);

    if (user.role !== Role.PATIENT) {
      throw new ForbiddenException('Only the patient can reschedule a consultation.');
    }
    if (appointment.state !== 'SCHEDULED') {
      throw new BadRequestException(
        appointment.state === 'COMPLETED'
          ? 'That consultation is already completed.'
          : 'That consultation was cancelled.',
      );
    }
    if (appointment.startsAt <= new Date()) {
      throw new BadRequestException('That consultation has already started.');
    }

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      throw new BadRequestException('Choose a valid future time slot.');
    }

    const offered = await this.availability.slotsFor(appointment.doctorId);
    if (!offered.some((s) => new Date(s.startsAt).getTime() === startsAt.getTime())) {
      throw new ConflictException('That slot is no longer available.');
    }

    const endsAt = new Date(startsAt.getTime() + SLOT_DURATION_MINUTES * 60_000);

    try {
      // One transaction, so a rejected move leaves the original slot held
      // rather than released into a gap.
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.appointment.update({
          where: { id: appointmentId },
          data: { startsAt, endsAt },
          include: APPOINTMENT_INCLUDE,
        });

        await this.notifications.emit(tx, [
          {
            userId: result.doctor.userId,
            type: 'APPOINTMENT_RESCHEDULED',
            title: 'Consultation rescheduled',
            body: `${result.patient.fullName ?? 'A patient'} moved their consultation to ${formatWhen(startsAt)}.`,
            link: '/doctor/appointments',
          },
          {
            userId: user.id,
            type: 'APPOINTMENT_RESCHEDULED',
            title: 'Consultation moved',
            body: `Your consultation with Dr. ${result.doctor.fullName} is now ${formatWhen(startsAt)}.`,
            link: '/patient/appointments',
          },
        ]);

        return result;
      });

      return toAppointmentDto(updated);
    } catch (error) {
      throw this.translateSlotConflict(error);
    }
  }

  async cancel(
    user: AuthUser,
    appointmentId: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentDto> {
    const appointment = await this.loadForParticipant(user, appointmentId);

    if (appointment.state === 'COMPLETED') {
      throw new BadRequestException('That consultation is already completed.');
    }
    if (appointment.state === 'CANCELLED') {
      throw new BadRequestException('That consultation was already cancelled.');
    }

    const cancelledBy =
      user.role === Role.PATIENT
        ? CancelledBy.PATIENT
        : user.role === Role.DOCTOR
          ? CancelledBy.DOCTOR
          : CancelledBy.ADMIN;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          state: 'CANCELLED',
          cancelledBy,
          cancellationReason: dto.reason?.trim() || null,
          cancelledAt: new Date(),
        },
        include: APPOINTMENT_INCLUDE,
      });

      const reasonSuffix = dto.reason?.trim() ? ` Reason: ${dto.reason.trim()}` : '';
      const when = formatWhen(result.startsAt);

      await this.notifications.emit(tx, [
        {
          userId: result.patient.userId,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Consultation cancelled',
          body: `Your consultation with Dr. ${result.doctor.fullName} on ${when} was cancelled.${reasonSuffix}`,
          link: '/patient/appointments',
        },
        {
          userId: result.doctor.userId,
          type: 'APPOINTMENT_CANCELLED',
          title: 'Consultation cancelled',
          body: `The consultation with ${result.patient.fullName ?? 'a patient'} on ${when} was cancelled.${reasonSuffix}`,
          link: '/doctor/appointments',
        },
      ]);

      return result;
    });

    return toAppointmentDto(updated);
  }

  /** A patient sees only their own; a doctor only theirs. */
  async listForUser(
    user: AuthUser,
    scope: 'upcoming' | 'past' | 'all' = 'all',
  ): Promise<AppointmentDto[]> {
    const now = new Date();

    const ownership: Prisma.AppointmentWhereInput =
      user.role === Role.PATIENT
        ? { patient: { userId: user.id } }
        : { doctor: { userId: user.id } };

    const timing: Prisma.AppointmentWhereInput =
      scope === 'upcoming'
        ? { state: 'SCHEDULED', startsAt: { gte: now } }
        : scope === 'past'
          ? { OR: [{ startsAt: { lt: now } }, { state: { in: ['COMPLETED', 'CANCELLED'] } }] }
          : {};

    const rows = await this.prisma.appointment.findMany({
      where: { AND: [ownership, timing] },
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: scope === 'past' ? 'desc' : 'asc' },
    });

    return rows.map(toAppointmentDto);
  }

  async getForUser(user: AuthUser, appointmentId: string): Promise<AppointmentDto> {
    const row = await this.loadForParticipant(user, appointmentId);
    return toAppointmentDto(row);
  }

  /**
   * Loads an appointment only if this user is one of its two participants.
   *
   * Ownership lives here rather than in a guard because answering it needs the
   * record. Admins are allowed through for oversight; everyone else gets
   * not-found, which does not confirm the appointment exists.
   */
  async loadForParticipant(
    user: AuthUser,
    appointmentId: string,
  ): Promise<AppointmentRow> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: APPOINTMENT_INCLUDE,
    });

    if (!appointment) throw new NotFoundException('That consultation does not exist.');

    const isPatient = appointment.patient.userId === user.id;
    const isDoctor = appointment.doctor.userId === user.id;

    if (!isPatient && !isDoctor && user.role !== Role.ADMIN) {
      throw new NotFoundException('That consultation does not exist.');
    }

    return appointment;
  }

  /**
   * Translates the database's verdict on a slot race into an HTTP answer.
   *
   * Both the doctor-side and patient-side partial unique indexes surface as
   * P2002; which one fired tells the patient whether the doctor's slot went or
   * whether they already hold something at that time.
   */
  private translateSlotConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      const target = String(error.meta?.target ?? '');
      if (target.includes('patient')) {
        return new ConflictException('You already have a consultation at that time.');
      }
      return new ConflictException(
        'Someone just took that slot. Please choose another time.',
      );
    }
    return error;
  }
}

function formatWhen(date: Date): string {
  return date.toLocaleString('en-PH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
