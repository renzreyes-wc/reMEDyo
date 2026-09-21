import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Specialization } from '@prisma/client';

export class DoctorQueryDto {
  /** Free text matched against name and specialization. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsEnum(Specialization, { message: 'Unknown specialization.' })
  specialization?: Specialization;

  /** Restrict to doctors with a slot inside the "soon" horizon. */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  availableSoon?: boolean;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Enter your full name.' })
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one specialization.' })
  @IsEnum(Specialization, { each: true, message: 'Choose a specialization from the list.' })
  specializations?: Specialization[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1_000_000)
  consultationFee?: number;
}
