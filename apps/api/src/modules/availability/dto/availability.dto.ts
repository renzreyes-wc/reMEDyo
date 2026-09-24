import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/**
 * Declared here rather than inline in the controller: the `@nestjs/swagger`
 * CLI plugin dispatches per file by filename suffix, so a DTO defined in a
 * `.controller.ts` file gets no schema and is documented as an empty object.
 */

/** A weekly recurring window of availability, in the doctor's local time. */
export class CreateWindowDto {
  /** 0 = Sunday .. 6 = Saturday. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  /** Minutes from midnight, local to the doctor. */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1439)
  startMinute!: number;

  /** Minutes from midnight, local to the doctor. Must be after startMinute. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  endMinute!: number;
}

/** A single date the doctor is unavailable, overriding any weekly window. */
export class CreateExceptionDto {
  /** ISO date, `YYYY-MM-DD`. */
  @IsString()
  date!: string;

  /** Shown to the doctor only. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
