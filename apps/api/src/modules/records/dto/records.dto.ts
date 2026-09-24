import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertNoteDto {
  @IsString()
  @MaxLength(4000)
  @MinLength(3, { message: 'Record what you found.' })
  findings!: string;

  @IsString()
  @MaxLength(2000)
  @MinLength(3, { message: 'Record a diagnosis or impression.' })
  diagnosis!: string;

  @IsString()
  @MaxLength(4000)
  @MinLength(3, { message: 'Record your recommendations.' })
  recommendations!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  followUp?: string;

  /**
   * Whether the doctor started from a generated draft.
   *
   * Declared by the authoring interface, because only the form knows: the
   * presence of a draft row does not tell you the doctor used it. A
   * provenance marker, not an integrity control — see design.md D7.
   */
  @IsOptional()
  @IsBoolean()
  aiAssisted?: boolean;
}

export class CreatePrescriptionDto {
  @IsString()
  @MaxLength(200)
  @MinLength(2, { message: 'Enter the medication name.' })
  medication!: string;

  @IsString()
  @MaxLength(100)
  @MinLength(1, { message: 'Enter the dosage.' })
  dosage!: string;

  @IsString()
  @MaxLength(200)
  @MinLength(1, { message: 'Enter how often it should be taken.' })
  frequency!: string;

  @Type(() => Number)
  @IsInt({ message: 'Enter the duration in days.' })
  @Min(1)
  @Max(365)
  durationDays!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  instructions?: string;
}
