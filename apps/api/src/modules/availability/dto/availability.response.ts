import { ApiProperty } from '@nestjs/swagger';
import type { AvailabilityException, AvailabilityWindow, Slot } from '@remedyo/shared';

/**
 * Response models for the availability surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 */

/**
 * An offerable booking slot. Derived from the doctor's windows and exceptions
 * on every read, never stored.
 */
export class SlotDto implements Slot {
  @ApiProperty({ format: 'date-time', description: 'ISO-8601 start instant.' })
  startsAt!: string;

  @ApiProperty({ format: 'date-time', description: 'ISO-8601 end instant.' })
  endsAt!: string;
}

export class AvailabilityWindowDto implements AvailabilityWindow {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ minimum: 0, maximum: 6, description: '0 = Sunday .. 6 = Saturday.' })
  dayOfWeek!: number;

  @ApiProperty({
    minimum: 0,
    maximum: 1439,
    description: 'Minutes from midnight, local to the doctor.',
  })
  startMinute!: number;

  @ApiProperty({
    minimum: 1,
    maximum: 1440,
    description: 'Minutes from midnight, local to the doctor.',
  })
  endMinute!: number;
}

export class AvailabilityExceptionDto implements AvailabilityException {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date', description: 'ISO date, marked unavailable.' })
  date!: string;

  @ApiProperty({ nullable: true, description: 'Visible to the owning doctor only.' })
  reason!: string | null;
}
