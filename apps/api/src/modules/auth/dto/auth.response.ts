import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus, ApprovalState, Role, type SessionUser } from '@remedyo/shared';

/**
 * Response models for the auth surface (design D7).
 *
 * Each class `implements` the `@remedyo/shared` type it mirrors, so a change to
 * the shared type is a compile error here rather than a stale page in the
 * published reference.
 *
 * The decorators are explicit rather than inferred. Inference cannot tell
 * `string | null` from `string`, and most fields here are nullable — a
 * reference that quietly promises a non-null name is worse than no reference.
 */
export class SessionUserDto implements SessionUser {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'email' })
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ enum: AccountStatus })
  status!: AccountStatus;

  @ApiProperty({
    nullable: true,
    description: 'Display name, or null before a profile has been filled in.',
  })
  displayName!: string | null;

  @ApiProperty({ description: 'One or two characters, for the avatar.' })
  initials!: string;

  @ApiProperty({
    description:
      'Patients: name and date of birth present. Doctors: profile submitted.',
  })
  profileComplete!: boolean;

  @ApiPropertyOptional({
    enum: ApprovalState,
    description: 'Doctors only. Absent for patients.',
  })
  approvalState?: ApprovalState;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true, description: 'Always true; the cookie is cleared.' })
  ok!: true;
}
