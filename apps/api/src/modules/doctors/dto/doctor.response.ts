import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ApprovalState,
  Specialization,
  type DoctorDetail,
  type DoctorSummary,
} from '@remedyo/shared';
import { SlotDto } from '../../availability/dto/availability.response';

/**
 * Response models for the doctor directory (design D7). Each class `implements`
 * the `@remedyo/shared` type it mirrors.
 */

/** A doctor as they appear in search results. */
export class DoctorSummaryDto implements DoctorSummary {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty({ description: 'One or two characters, for the avatar.' })
  initials!: string;

  @ApiProperty({ enum: Specialization, isArray: true })
  specializations!: Specialization[];

  @ApiProperty()
  yearsExperience!: number;

  @ApiProperty()
  consultationFee!: number;

  @ApiProperty({ description: 'A short extract of the doctor’s own biography.' })
  bioExcerpt!: string;

  @ApiProperty({ description: 'Whether the doctor has any offerable slot in the window searched.' })
  hasUpcomingAvailability!: boolean;

  @ApiProperty({ enum: ApprovalState })
  approvalState!: ApprovalState;
}

/** A doctor with everything the booking page shows. */
export class DoctorDetailDto extends DoctorSummaryDto implements DoctorDetail {
  @ApiProperty()
  bio!: string;

  @ApiProperty()
  licenseNumber!: string;

  @ApiProperty({
    type: [SlotDto],
    description: 'The soonest offerable slots, for the booking page.',
  })
  nextSlots!: SlotDto[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Populated only for a doctor whose application was rejected.',
  })
  rejectionReason?: string | null;
}
