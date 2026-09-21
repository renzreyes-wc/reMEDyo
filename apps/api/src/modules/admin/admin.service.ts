import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, AuditAction, Prisma, Role } from '@prisma/client';
import type {
  AdminStats,
  AdminUserRow,
  Appointment as AppointmentDto,
  AuditEntry,
  DoctorDetail,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { initialsOf } from '../../common/initials';
import type { AuthUser } from '../../common/types';
import { APPOINTMENT_INCLUDE, toAppointmentDto } from '../appointments/appointments.mapper';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AdminAppointmentQueryDto,
  AdminUserQueryDto,
  AuditQueryDto,
  RejectDoctorDto,
  SuspendAccountDto,
  UpdateSpecializationsDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  // --- Accounts ------------------------------------------------------------

  async listUsers(query: AdminUserQueryDto): Promise<AdminUserRow[]> {
    const where: Prisma.UserWhereInput = {
      // Administrators are not listed: they are provisioned, not managed here,
      // and there is no route by which one can act on another.
      role: query.role ?? { in: [Role.PATIENT, Role.DOCTOR] },
    };

    if (query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { patientProfile: { fullName: { contains: term, mode: 'insensitive' } } },
        { doctorProfile: { fullName: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        patientProfile: { select: { fullName: true } },
        doctorProfile: { select: { fullName: true, approvalState: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((u) => {
      const fullName = u.patientProfile?.fullName ?? u.doctorProfile?.fullName ?? null;
      return {
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        fullName,
        initials: initialsOf(fullName) || u.email.slice(0, 2).toUpperCase(),
        statusReason: u.statusReason,
        createdAt: u.createdAt.toISOString(),
        approvalState: u.doctorProfile?.approvalState ?? null,
      };
    });
  }

  async setAccountStatus(
    admin: AuthUser,
    userId: string,
    status: AccountStatus,
    dto: SuspendAccountDto | undefined,
  ): Promise<AdminUserRow> {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('That account does not exist.');

    if (target.role === Role.ADMIN) {
      throw new BadRequestException('Administrator accounts cannot be changed here.');
    }

    // Activation needs no justification; taking access away does.
    const requiresReason = status !== AccountStatus.ACTIVE;
    const reason = dto?.reason?.trim();
    if (requiresReason && !reason) {
      throw new BadRequestException('Give a reason for this change.');
    }

    const action =
      status === AccountStatus.ACTIVE
        ? AuditAction.ACCOUNT_ACTIVATED
        : status === AccountStatus.SUSPENDED
          ? AuditAction.ACCOUNT_SUSPENDED
          : AuditAction.ACCOUNT_DEACTIVATED;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status, statusReason: reason ?? null },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action,
          targetType: 'User',
          targetId: userId,
          reason: reason ?? null,
        },
      });

      await this.notifications.emit(tx, {
        userId,
        type: 'ACCOUNT_STATUS_CHANGED',
        title:
          status === AccountStatus.ACTIVE
            ? 'Your account is active again'
            : `Your account has been ${status.toLowerCase()}`,
        body: reason ? `Reason: ${reason}` : 'An administrator updated your account.',
        link: null,
      });
    });

    const [row] = await this.listUsers({ q: target.email });
    return row;
  }

  // --- Doctor review -------------------------------------------------------

  async reviewQueue(): Promise<DoctorDetail[]> {
    const doctors = await this.prisma.doctorProfile.findMany({
      where: { approvalState: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    return doctors.map((d) => ({
      id: d.id,
      userId: d.userId,
      fullName: d.fullName,
      initials: initialsOf(d.fullName),
      specializations: d.specializations,
      yearsExperience: d.yearsExperience,
      consultationFee: Number(d.consultationFee),
      bioExcerpt: d.bio.slice(0, 160),
      bio: d.bio,
      licenseNumber: d.licenseNumber,
      hasUpcomingAvailability: false,
      approvalState: d.approvalState,
      nextSlots: [],
      rejectionReason: d.rejectionReason,
    }));
  }

  async approveDoctor(admin: AuthUser, doctorId: string): Promise<void> {
    const doctor = await this.requireDoctor(doctorId);

    await this.prisma.$transaction(async (tx) => {
      await tx.doctorProfile.update({
        where: { id: doctorId },
        data: { approvalState: 'APPROVED', rejectionReason: null, reviewedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: AuditAction.DOCTOR_APPROVED,
          targetType: 'DoctorProfile',
          targetId: doctorId,
        },
      });

      await this.notifications.emit(tx, {
        userId: doctor.userId,
        type: 'DOCTOR_APPROVED',
        title: 'Your profile is approved',
        body: 'You now appear in the doctor directory and patients can book you.',
        link: '/doctor',
      });
    });
  }

  async rejectDoctor(
    admin: AuthUser,
    doctorId: string,
    dto: RejectDoctorDto,
  ): Promise<void> {
    const doctor = await this.requireDoctor(doctorId);
    const reason = dto.reason.trim();

    await this.prisma.$transaction(async (tx) => {
      await tx.doctorProfile.update({
        where: { id: doctorId },
        data: { approvalState: 'REJECTED', rejectionReason: reason, reviewedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: AuditAction.DOCTOR_REJECTED,
          targetType: 'DoctorProfile',
          targetId: doctorId,
          reason,
        },
      });

      await this.notifications.emit(tx, {
        userId: doctor.userId,
        type: 'DOCTOR_REJECTED',
        title: 'Your profile was not approved',
        body: `Reason: ${reason}`,
        link: '/doctor/profile',
      });
    });
  }

  async updateSpecializations(
    admin: AuthUser,
    doctorId: string,
    dto: UpdateSpecializationsDto,
  ): Promise<void> {
    await this.requireDoctor(doctorId);

    await this.prisma.$transaction(async (tx) => {
      await tx.doctorProfile.update({
        where: { id: doctorId },
        data: { specializations: dto.specializations },
      });

      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: AuditAction.DOCTOR_SPECIALIZATION_UPDATED,
          targetType: 'DoctorProfile',
          targetId: doctorId,
          reason: dto.reason?.trim() || null,
        },
      });
    });
  }

  // --- Appointment oversight ----------------------------------------------

  async listAppointments(query: AdminAppointmentQueryDto): Promise<AppointmentDto[]> {
    const where: Prisma.AppointmentWhereInput = {};

    if (query.state) where.state = query.state;
    if (query.from || query.to) {
      where.startsAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const rows = await this.prisma.appointment.findMany({
      where,
      include: APPOINTMENT_INCLUDE,
      orderBy: { startsAt: 'desc' },
      take: 200,
    });

    return rows.map(toAppointmentDto);
  }

  async cancelAppointment(
    admin: AuthUser,
    appointmentId: string,
    reason?: string,
  ): Promise<AppointmentDto> {
    // Reuses the ordinary cancellation path, so the slot release and the
    // participant notifications behave identically to a patient cancelling.
    const cancelled = await this.appointments.cancel(admin, appointmentId, { reason });

    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: AuditAction.APPOINTMENT_CANCELLED,
        targetType: 'Appointment',
        targetId: appointmentId,
        reason: reason?.trim() || null,
      },
    });

    return cancelled;
  }

  // --- Dashboard and audit -------------------------------------------------

  async stats(): Promise<AdminStats> {
    const [patients, doctors, pending, byState, completedSessions] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.PATIENT } }),
      this.prisma.user.count({ where: { role: Role.DOCTOR } }),
      this.prisma.doctorProfile.count({ where: { approvalState: 'PENDING' } }),
      this.prisma.appointment.groupBy({ by: ['state'], _count: { _all: true } }),
      this.prisma.consultationSession.count({ where: { state: 'COMPLETED' } }),
    ]);

    // Always report every state, so an empty system shows zeros rather than
    // gaps the dashboard has to guess about.
    const appointmentsByState = {
      SCHEDULED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    } as AdminStats['appointmentsByState'];

    for (const row of byState) {
      appointmentsByState[row.state] = row._count._all;
    }

    return {
      patients,
      doctors,
      doctorsPendingReview: pending,
      appointmentsByState,
      consultationsCompleted: completedSessions,
    };
  }

  async auditLog(query: AuditQueryDto): Promise<AuditEntry[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: {
        ...(query.actorId ? { actorId: query.actorId } : {}),
        ...(query.action ? { action: query.action } : {}),
      },
      include: {
        actor: {
          select: {
            email: true,
            patientProfile: { select: { fullName: true } },
            doctorProfile: { select: { fullName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return entries.map((e) => ({
      id: e.id,
      actorId: e.actorId,
      actorName:
        e.actor.doctorProfile?.fullName ??
        e.actor.patientProfile?.fullName ??
        e.actor.email,
      actorEmail: e.actor.email,
      action: e.action,
      targetType: e.targetType,
      targetId: e.targetId,
      reason: e.reason,
      createdAt: e.createdAt.toISOString(),
    }));
  }

  private async requireDoctor(doctorId: string) {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('That doctor profile does not exist.');
    return doctor;
  }
}
