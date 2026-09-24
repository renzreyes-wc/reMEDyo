import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Severity } from '@remedyo/shared';

/**
 * Declared here rather than inline in the controller: the `@nestjs/swagger`
 * CLI plugin dispatches per file by filename suffix, so a DTO defined in a
 * `.controller.ts` file gets no schema and is documented as an empty object.
 */

/** What the patient reports, before any rule is applied to it. */
export class MatchIntakeDto {
  /** Identifiers from the symptom catalogue. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  symptomIds?: string[];

  /** The patient's own words, matched against the same rules as the identifiers. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  freeText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  durationDays?: number;

  @IsOptional()
  @IsEnum(Severity)
  severity?: Severity;
}
