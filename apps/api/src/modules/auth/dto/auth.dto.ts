import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Specialization } from '@prisma/client';
import { MIN_PASSWORD_LENGTH } from '@remedyo/shared';

export class LoginDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Enter your password.' })
  password!: string;
}

export class RegisterPatientDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @IsString()
  @MaxLength(128)
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;
}

export class RegisterDoctorDto {
  @IsEmail({}, { message: 'Enter a valid email address.' })
  email!: string;

  @IsString()
  @MaxLength(128)
  @MinLength(MIN_PASSWORD_LENGTH, {
    message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  })
  password!: string;

  @IsString()
  @MaxLength(120)
  @MinLength(2, { message: 'Enter your full name.' })
  fullName!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Choose at least one specialization.' })
  @IsEnum(Specialization, {
    each: true,
    message: 'Choose a specialization from the list.',
  })
  specializations!: Specialization[];

  @IsString()
  @MaxLength(60)
  @MinLength(3, { message: 'Enter your license number.' })
  licenseNumber!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  yearsExperience?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;
}
