import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Specialization } from '@prisma/client';
import type { DoctorDetail, DoctorSummary } from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { initialsOf } from '../../common/initials';
import { AvailabilityService } from '../availability/availability.service';
import { DoctorQueryDto, UpdateDoctorProfileDto } from './dto/doctors.dto';

type DoctorRow = Prisma.DoctorProfileGetPayload<{ select: null }>;

const EXCERPT_LENGTH = 160;

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityService,
  ) {}

  /**
   * The patient-facing directory.
   *
   * Only approved doctors are ever returned: the approval state is part of the
   * where clause rather than a filter applied afterwards, so an unapproved
   * doctor cannot leak through a code path that forgets to check.
   */
  async list(query: DoctorQueryDto): Promise<DoctorSummary[]> {
    const where: Prisma.DoctorProfileWhereInput = { approvalState: 'APPROVED' };
    const and: Prisma.DoctorProfileWhereInput[] = [];

    if (query.q?.trim()) {
      const term = query.q.trim();
      // Free text matches the name, or a specialization whose enum value or
      // human label contains the term.
      const matchingSpecs = Object.values(Specialization).filter((s) =>
        s.replace(/_/g, ' ').toLowerCase().includes(term.toLowerCase()),
      );

      and.push({
        OR: [
          { fullName: { contains: term, mode: 'insensitive' } },
          ...(matchingSpecs.length ? [{ specializations: { hasSome: matchingSpecs } }] : []),
        ],
      });
    }

    if (query.specialization) {
      and.push({ specializations: { has: query.specialization } });
    }

    if (and.length) where.AND = and;

    const doctors = await this.prisma.doctorProfile.findMany({
      where,
      orderBy: [{ yearsExperience: 'desc' }, { fullName: 'asc' }],
    });

    // One availability pass for the whole page rather than a query per card.
    const availableSoon = await this.availability.doctorsWithUpcomingAvailability(
      doctors.map((d) => d.id),
    );

    const summaries = doctors.map((d) => this.toSummary(d, availableSoon.has(d.id)));

    // Filters combine conjunctively, so this narrows what the query already
    // produced rather than replacing it.
    return query.availableSoon
      ? summaries.filter((d) => d.hasUpcomingAvailability)
      : summaries;
  }

  /** Detail view. Not-found for anyone not approved, with no content leaked. */
  async detail(id: string): Promise<DoctorDetail> {
    const doctor = await this.prisma.doctorProfile.findFirst({
      where: { id, approvalState: 'APPROVED' },
    });

    if (!doctor) throw new NotFoundException('That doctor is not available.');

    const slots = await this.availability.slotsFor(doctor.id);
    const availableSoon = slots.length > 0;

    return {
      ...this.toSummary(doctor, availableSoon),
      bio: doctor.bio,
      licenseNumber: doctor.licenseNumber,
      nextSlots: slots.slice(0, 12),
    };
  }

  /** A doctor's own profile, readable whatever their approval state. */
  async ownProfile(userId: string): Promise<DoctorDetail> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    const slots = await this.availability.slotsFor(doctor.id);

    return {
      ...this.toSummary(doctor, slots.length > 0),
      bio: doctor.bio,
      licenseNumber: doctor.licenseNumber,
      nextSlots: slots.slice(0, 12),
      rejectionReason: doctor.rejectionReason,
    };
  }

  async updateOwnProfile(
    userId: string,
    dto: UpdateDoctorProfileDto,
  ): Promise<DoctorDetail> {
    const doctor = await this.prisma.doctorProfile.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    await this.prisma.doctorProfile.update({
      where: { userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.specializations !== undefined ? { specializations: dto.specializations } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio.trim() } : {}),
        ...(dto.yearsExperience !== undefined ? { yearsExperience: dto.yearsExperience } : {}),
        ...(dto.licenseNumber !== undefined ? { licenseNumber: dto.licenseNumber.trim() } : {}),
        ...(dto.consultationFee !== undefined ? { consultationFee: dto.consultationFee } : {}),
      },
    });

    return this.ownProfile(userId);
  }

  /** Resolves the doctor profile id for a signed-in doctor user. */
  async profileIdFor(userId: string): Promise<string> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');
    return doctor.id;
  }

  private toSummary(doctor: DoctorRow, hasUpcomingAvailability: boolean): DoctorSummary {
    return {
      id: doctor.id,
      userId: doctor.userId,
      fullName: doctor.fullName,
      initials: initialsOf(doctor.fullName),
      specializations: doctor.specializations,
      yearsExperience: doctor.yearsExperience,
      consultationFee: Number(doctor.consultationFee),
      bioExcerpt:
        doctor.bio.length > EXCERPT_LENGTH
          ? `${doctor.bio.slice(0, EXCERPT_LENGTH).trimEnd()}…`
          : doctor.bio,
      hasUpcomingAvailability,
      approvalState: doctor.approvalState,
    };
  }
}
