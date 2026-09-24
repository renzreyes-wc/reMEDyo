import { ApiProperty } from '@nestjs/swagger';
import {
  AccountStatus,
  AppointmentState,
  ApprovalState,
  AuditAction,
  Role,
  type AdminStats,
  type AdminUserRow,
  type AuditEntry,
} from '@remedyo/shared';

/**
 * Response models for the administration surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 */

export class AdminUserRowDto implements AdminUserRow {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: AccountStatus })
  status!: AccountStatus;

  @ApiProperty({ nullable: true })
  fullName!: string | null;

  @ApiProperty()
  initials!: string;

  @ApiProperty({ nullable: true, description: 'Why the account was suspended or deactivated.' })
  statusReason!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({
    enum: ApprovalState,
    nullable: true,
    description: 'Doctors only. Null for patients and administrators.',
  })
  approvalState!: ApprovalState | null;
}

export class AdminStatsDto implements AdminStats {
  @ApiProperty()
  patients!: number;

  @ApiProperty()
  doctors!: number;

  @ApiProperty({ description: 'Doctors whose application is still awaiting a decision.' })
  doctorsPendingReview!: number;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer' },
    description: 'One entry per stored appointment state, including states with a zero count.',
    example: { SCHEDULED: 12, COMPLETED: 40, CANCELLED: 3 },
  })
  appointmentsByState!: Record<AppointmentState, number>;

  @ApiProperty()
  consultationsCompleted!: number;
}

export class AuditEntryDto implements AuditEntry {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  actorId!: string;

  @ApiProperty()
  actorName!: string;

  @ApiProperty({ format: 'email' })
  actorEmail!: string;

  @ApiProperty({ enum: AuditAction })
  action!: AuditAction;

  @ApiProperty({ description: 'The kind of record acted on, such as `User` or `DoctorProfile`.' })
  targetType!: string;

  @ApiProperty({ format: 'uuid' })
  targetId!: string;

  @ApiProperty({ nullable: true, description: 'The administrator’s stated reason, where given.' })
  reason!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
