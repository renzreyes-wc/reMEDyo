import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { AppointmentState, AuditAction, Role, Specialization } from '@prisma/client';

export class AdminUserQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
}

export class SuspendAccountDto {
  /** Mandatory: the admin-console spec rejects a reasonless suspension. */
  @IsString()
  @MaxLength(500)
  @MinLength(3, { message: 'Give a reason for this change.' })
  reason!: string;
}

export class RejectDoctorDto {
  @IsString()
  @MaxLength(500)
  @MinLength(3, { message: 'Give the doctor a reason for the rejection.' })
  reason!: string;
}

export class UpdateSpecializationsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'A doctor needs at least one specialization.' })
  @IsEnum(Specialization, { each: true, message: 'Unknown specialization.' })
  specializations!: Specialization[];

  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AdminAppointmentQueryDto {
  @IsOptional() @IsEnum(AppointmentState) state?: AppointmentState;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class AuditQueryDto {
  @IsOptional() @IsString() actorId?: string;
  @IsOptional() @IsEnum(AuditAction) action?: AuditAction;
}

export class AdminCancelDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  reason?: string;
}
