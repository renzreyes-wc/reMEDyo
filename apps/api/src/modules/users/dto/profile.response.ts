import { ApiProperty } from '@nestjs/swagger';
import {
  MedicalHistoryKind,
  type MedicalHistoryEntry,
  type PatientProfile,
} from '@remedyo/shared';

/**
 * Response models for the patient profile surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 */

export class MedicalHistoryEntryDto implements MedicalHistoryEntry {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: MedicalHistoryKind })
  kind!: MedicalHistoryKind;

  @ApiProperty()
  description!: string;

  @ApiProperty({ format: 'date-time' })
  recordedAt!: string;
}

export class PatientProfileDto implements PatientProfile {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ nullable: true })
  fullName!: string | null;

  @ApiProperty({ format: 'date', nullable: true, description: 'ISO date, `YYYY-MM-DD`.' })
  dateOfBirth!: string | null;

  @ApiProperty({ nullable: true, description: 'Derived from dateOfBirth, never stored.' })
  age!: number | null;

  @ApiProperty({ nullable: true })
  contactNumber!: string | null;

  @ApiProperty({ nullable: true })
  weightKg!: number | null;

  @ApiProperty({ nullable: true })
  heightCm!: number | null;

  @ApiProperty({ description: 'One or two characters, for the avatar.' })
  initials!: string;

  @ApiProperty({ type: [MedicalHistoryEntryDto] })
  history!: MedicalHistoryEntryDto[];
}
