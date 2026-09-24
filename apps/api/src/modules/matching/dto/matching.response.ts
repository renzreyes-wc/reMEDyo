import { ApiProperty } from '@nestjs/swagger';
import {
  Specialization,
  type MatchResult,
  type MatchSuggestion,
  type SymptomOption,
} from '@remedyo/shared';
import { DoctorSummaryDto } from '../../doctors/dto/doctor.response';

/**
 * Response models for the matching surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 */

/** One entry in the symptom catalogue the intake form offers. */
export class SymptomOptionDto implements SymptomOption {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({
    description:
      'Emergency indicators trigger prominent guidance ahead of any suggestion of care.',
  })
  emergency!: boolean;
}

export class MatchSuggestionDto implements MatchSuggestion {
  @ApiProperty({ type: DoctorSummaryDto })
  doctor!: DoctorSummaryDto;

  @ApiProperty({ description: 'Deterministic: the same intake always scores the same.' })
  score!: number;

  @ApiProperty({ enum: Specialization })
  matchedSpecialization!: Specialization;

  @ApiProperty({
    description: 'Plain language, naming the concerns that produced the match.',
  })
  reason!: string;
}

export class MatchResultDto implements MatchResult {
  @ApiProperty({ type: [MatchSuggestionDto] })
  suggestions!: MatchSuggestionDto[];

  @ApiProperty({ description: 'True when no rule matched, or no doctor held the matched specialty.' })
  fallback!: boolean;

  @ApiProperty({ nullable: true })
  fallbackReason!: string | null;

  @ApiProperty({
    description:
      'True when the intake contained an emergency indicator. Rendered ahead of the suggestions.',
  })
  emergencyWarning!: boolean;
}
