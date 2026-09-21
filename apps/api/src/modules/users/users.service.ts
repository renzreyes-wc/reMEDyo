import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { MedicalHistoryEntry, PatientProfile } from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { ageFrom, initialsOf } from '../../common/initials';
import { AddHistoryEntryDto, UpdatePatientProfileDto } from './dto/profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async patientProfile(userId: string): Promise<PatientProfile> {
    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      include: { history: { orderBy: { recordedAt: 'desc' } } },
    });

    if (!profile) throw new NotFoundException('Patient profile not found.');

    return this.toDto(profile);
  }

  async updatePatientProfile(
    userId: string,
    dto: UpdatePatientProfileDto,
  ): Promise<PatientProfile> {
    const existing = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!existing) throw new NotFoundException('Patient profile not found.');

    let dateOfBirth: Date | undefined;
    if (dto.dateOfBirth !== undefined) {
      dateOfBirth = new Date(dto.dateOfBirth);
      if (Number.isNaN(dateOfBirth.getTime())) {
        throw new BadRequestException('Enter a valid date of birth.');
      }
      if (dateOfBirth > new Date()) {
        throw new BadRequestException('Date of birth cannot be in the future.');
      }
    }

    const updated = await this.prisma.patientProfile.update({
      where: { userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() || null } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        ...(dto.contactNumber !== undefined
          ? { contactNumber: dto.contactNumber.trim() || null }
          : {}),
        ...(dto.weightKg !== undefined ? { weightKg: dto.weightKg } : {}),
        ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
      },
      include: { history: { orderBy: { recordedAt: 'desc' } } },
    });

    return this.toDto(updated);
  }

  async addHistoryEntry(
    userId: string,
    dto: AddHistoryEntryDto,
  ): Promise<MedicalHistoryEntry> {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Patient profile not found.');

    const entry = await this.prisma.medicalHistoryEntry.create({
      data: {
        patientId: profile.id,
        kind: dto.kind,
        description: dto.description.trim(),
      },
    });

    return {
      id: entry.id,
      kind: entry.kind,
      description: entry.description,
      recordedAt: entry.recordedAt.toISOString(),
    };
  }

  async removeHistoryEntry(userId: string, entryId: string): Promise<void> {
    const profile = await this.prisma.patientProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Patient profile not found.');

    const entry = await this.prisma.medicalHistoryEntry.findUnique({
      where: { id: entryId },
    });

    // Not-found rather than forbidden: an entry belonging to someone else
    // should not be distinguishable from one that does not exist.
    if (!entry || entry.patientId !== profile.id) {
      throw new NotFoundException('That entry does not exist.');
    }

    await this.prisma.medicalHistoryEntry.delete({ where: { id: entryId } });
  }

  private toDto(profile: {
    id: string;
    userId: string;
    fullName: string | null;
    dateOfBirth: Date | null;
    contactNumber: string | null;
    weightKg: number | null;
    heightCm: number | null;
    history: { id: string; kind: string; description: string; recordedAt: Date }[];
  }): PatientProfile {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      dateOfBirth: profile.dateOfBirth?.toISOString() ?? null,
      // Derived on read, never stored, so it cannot go stale.
      age: ageFrom(profile.dateOfBirth),
      contactNumber: profile.contactNumber,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      initials: initialsOf(profile.fullName),
      history: profile.history.map((h) => ({
        id: h.id,
        kind: h.kind as MedicalHistoryEntry['kind'],
        description: h.description,
        recordedAt: h.recordedAt.toISOString(),
      })),
    };
  }
}
