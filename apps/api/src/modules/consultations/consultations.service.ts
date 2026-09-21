import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MedicalHistoryKind, Role, SessionState } from '@prisma/client';
import {
  JOIN_WINDOW_AFTER_MINUTES,
  JOIN_WINDOW_BEFORE_MINUTES,
  type ConsultationContext,
  type ConsultationMessage,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { ageFrom } from '../../common/initials';
import type { AuthUser } from '../../common/types';
import { AppointmentsService } from '../appointments/appointments.service';
import { toAppointmentDto } from '../appointments/appointments.mapper';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Forward-only transitions. The value is the order; a move is legal only to a
 * strictly higher rank, which is what makes "a completed session cannot go
 * back" a single comparison rather than a tangle of conditionals.
 */
const RANK: Record<SessionState, number> = {
  SCHEDULED: 0,
  JOINED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
};

@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async context(user: AuthUser, appointmentId: string): Promise<ConsultationContext> {
    const appointment = await this.appointments.loadForParticipant(user, appointmentId);

    const isDoctor = appointment.doctor.userId === user.id;
    const isPatient = appointment.patient.userId === user.id;

    // Admins may read an appointment for oversight, but the consultation
    // workspace itself belongs to its two participants.
    if (!isDoctor && !isPatient) {
      throw new NotFoundException('That consultation does not exist.');
    }

    const session = await this.ensureSession(appointmentId);
    const { opensAt, closesAt } = this.joinWindow(appointment.startsAt, appointment.endsAt);

    const messages = await this.messages(appointmentId);

    const now = new Date();
    const joinable =
      appointment.state === 'SCHEDULED' && now >= opensAt && now <= closesAt;

    const context: ConsultationContext = {
      appointment: toAppointmentDto(appointment),
      sessionState: session.state,
      patientJoinedAt: session.patientJoinedAt?.toISOString() ?? null,
      doctorJoinedAt: session.doctorJoinedAt?.toISOString() ?? null,
      joinable,
      joinOpensAt: opensAt.toISOString(),
      joinClosesAt: closesAt.toISOString(),
      messages,
    };

    // Clinical context is for the clinician only — the patient already knows
    // their own history, and this keeps the payload role-shaped.
    if (isDoctor) {
      const history = await this.prisma.medicalHistoryEntry.findMany({
        where: { patientId: appointment.patientId },
      });
      const patient = await this.prisma.patientProfile.findUnique({
        where: { id: appointment.patientId },
        select: { dateOfBirth: true },
      });

      const pick = (kind: MedicalHistoryKind) =>
        history.filter((h) => h.kind === kind).map((h) => h.description);

      context.clinicalContext = {
        age: ageFrom(patient?.dateOfBirth),
        allergies: pick(MedicalHistoryKind.ALLERGY),
        medications: pick(MedicalHistoryKind.MEDICATION),
        conditions: pick(MedicalHistoryKind.CONDITION),
      };
    }

    return context;
  }

  async join(user: AuthUser, appointmentId: string): Promise<ConsultationContext> {
    const appointment = await this.appointments.loadForParticipant(user, appointmentId);

    if (appointment.state === 'CANCELLED') {
      throw new BadRequestException('That consultation was cancelled.');
    }
    if (appointment.state === 'COMPLETED') {
      throw new BadRequestException('That consultation is already finished.');
    }

    const isDoctor = appointment.doctor.userId === user.id;
    const isPatient = appointment.patient.userId === user.id;
    if (!isDoctor && !isPatient) {
      throw new NotFoundException('That consultation does not exist.');
    }

    const { opensAt, closesAt } = this.joinWindow(appointment.startsAt, appointment.endsAt);
    const now = new Date();

    if (now < opensAt) {
      throw new BadRequestException(
        `This consultation opens at ${opensAt.toLocaleTimeString('en-PH', {
          hour: 'numeric',
          minute: '2-digit',
        })}.`,
      );
    }
    if (now > closesAt) {
      throw new BadRequestException('The join window for this consultation has closed.');
    }

    const session = await this.ensureSession(appointmentId);

    const patientJoinedAt = isPatient
      ? (session.patientJoinedAt ?? now)
      : session.patientJoinedAt;
    const doctorJoinedAt = isDoctor
      ? (session.doctorJoinedAt ?? now)
      : session.doctorJoinedAt;

    // One participant present is JOINED; both present is IN_PROGRESS.
    const target: SessionState =
      patientJoinedAt && doctorJoinedAt ? 'IN_PROGRESS' : 'JOINED';

    await this.prisma.consultationSession.update({
      where: { appointmentId },
      data: {
        patientJoinedAt,
        doctorJoinedAt,
        // Never regress: a rejoin after both were present stays IN_PROGRESS.
        state: RANK[target] > RANK[session.state] ? target : session.state,
        startedAt:
          target === 'IN_PROGRESS' && !session.startedAt ? now : session.startedAt,
      },
    });

    return this.context(user, appointmentId);
  }

  /** Only the doctor ends a consultation. */
  async complete(user: AuthUser, appointmentId: string): Promise<ConsultationContext> {
    const appointment = await this.appointments.loadForParticipant(user, appointmentId);

    if (user.role !== Role.DOCTOR || appointment.doctor.userId !== user.id) {
      throw new ForbiddenException('Only the doctor can end a consultation.');
    }
    if (appointment.state === 'CANCELLED') {
      throw new BadRequestException('That consultation was cancelled.');
    }

    const session = await this.ensureSession(appointmentId);

    if (session.state === 'COMPLETED') {
      throw new BadRequestException('That consultation is already completed.');
    }
    if (session.state === 'SCHEDULED') {
      throw new BadRequestException('Join the consultation before ending it.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.consultationSession.update({
        where: { appointmentId },
        data: { state: 'COMPLETED', completedAt: now },
      });

      await tx.appointment.update({
        where: { id: appointmentId },
        data: { state: 'COMPLETED' },
      });
    });

    return this.context(user, appointmentId);
  }

  async sendMessage(
    user: AuthUser,
    appointmentId: string,
    body: string,
  ): Promise<ConsultationMessage> {
    const appointment = await this.appointments.loadForParticipant(user, appointmentId);

    const isParticipant =
      appointment.doctor.userId === user.id || appointment.patient.userId === user.id;
    if (!isParticipant) {
      throw new NotFoundException('That consultation does not exist.');
    }

    const session = await this.ensureSession(appointmentId);

    if (session.state === 'COMPLETED' || appointment.state !== 'SCHEDULED') {
      throw new BadRequestException(
        'This consultation has ended. The transcript is read-only.',
      );
    }
    if (session.state === 'SCHEDULED') {
      throw new BadRequestException('Join the consultation before sending a message.');
    }

    const trimmed = body.trim();
    if (!trimmed) throw new BadRequestException('Write something first.');

    const message = await this.prisma.message.create({
      data: { appointmentId, senderId: user.id, body: trimmed },
      include: { sender: { select: { id: true } } },
    });

    const senderName = await this.displayName(user.id);

    return {
      id: message.id,
      appointmentId,
      senderId: message.senderId,
      senderName,
      body: message.body,
      sentAt: message.sentAt.toISOString(),
    };
  }

  private async messages(appointmentId: string): Promise<ConsultationMessage[]> {
    const rows = await this.prisma.message.findMany({
      where: { appointmentId },
      orderBy: { sentAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            patientProfile: { select: { fullName: true } },
            doctorProfile: { select: { fullName: true } },
          },
        },
      },
    });

    return rows.map((m) => ({
      id: m.id,
      appointmentId,
      senderId: m.senderId,
      senderName:
        m.sender.doctorProfile?.fullName
          ? `Dr. ${m.sender.doctorProfile.fullName}`
          : (m.sender.patientProfile?.fullName ?? 'Participant'),
      body: m.body,
      sentAt: m.sentAt.toISOString(),
    }));
  }

  private async displayName(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        patientProfile: { select: { fullName: true } },
        doctorProfile: { select: { fullName: true } },
      },
    });
    return user?.doctorProfile?.fullName
      ? `Dr. ${user.doctorProfile.fullName}`
      : (user?.patientProfile?.fullName ?? 'Participant');
  }

  /** Older appointments may predate their session row; create it on demand. */
  private async ensureSession(appointmentId: string) {
    const existing = await this.prisma.consultationSession.findUnique({
      where: { appointmentId },
    });
    if (existing) return existing;

    return this.prisma.consultationSession.create({
      data: { appointmentId, state: 'SCHEDULED' },
    });
  }

  private joinWindow(startsAt: Date, endsAt: Date): { opensAt: Date; closesAt: Date } {
    return {
      opensAt: new Date(startsAt.getTime() - JOIN_WINDOW_BEFORE_MINUTES * 60_000),
      closesAt: new Date(endsAt.getTime() + JOIN_WINDOW_AFTER_MINUTES * 60_000),
    };
  }
}
