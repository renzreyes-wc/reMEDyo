import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MedicalHistoryKind } from '@prisma/client';

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Enter a valid date of birth.' })
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  contactNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Weight must be a number.' })
  @Min(1)
  @Max(500)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Height must be a number.' })
  @Min(20)
  @Max(280)
  heightCm?: number;
}

export class AddHistoryEntryDto {
  @IsEnum(MedicalHistoryKind)
  kind!: MedicalHistoryKind;

  @IsString()
  @MinLength(2, { message: 'Describe the entry.' })
  @MaxLength(500)
  description!: string;
}
