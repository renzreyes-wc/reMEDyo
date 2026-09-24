import { ApiProperty } from '@nestjs/swagger';
import {
  AppointmentState,
  CancelledBy,
  SessionState,
  Specialization,
  type Appointment,
  type AppointmentParty,
} from '@remedyo/shared';

/**
 * Response models for the appointments surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 *
 * Reused by other modules that return an appointment: consultations, records
 * and admin all embed this shape.
 */

/** The name shown for the other participant, without their account details. */
export class AppointmentPartyDto implements AppointmentParty {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  initials!: string;
}

/** The doctor side of an appointment, which also carries their specializations. */
export class AppointmentDoctorDto extends AppointmentPartyDto {
  @ApiProperty({ enum: Specialization, isArray: true })
  specializations!: Specialization[];
}

export class AppointmentDto implements Appointment {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: AppointmentPartyDto })
  patient!: AppointmentPartyDto;

  @ApiProperty({
    type: AppointmentDoctorDto,
    description: 'The doctor, with the specializations the booking page shows.',
  })
  doctor!: AppointmentDoctorDto;

  @ApiProperty({ format: 'date-time' })
  startsAt!: string;

  @ApiProperty({ format: 'date-time' })
  endsAt!: string;

  @ApiProperty({ enum: AppointmentState })
  state!: AppointmentState;

  @ApiProperty({ enum: SessionState })
  sessionState!: SessionState;

  @ApiProperty({ description: 'The patient’s own words when booking.' })
  reasonForVisit!: string;

  @ApiProperty({ enum: CancelledBy, nullable: true })
  cancelledBy!: CancelledBy | null;

  @ApiProperty({ nullable: true })
  cancellationReason!: string | null;

  @ApiProperty({ description: 'Derived: the join window closed with no completion.' })
  missed!: boolean;

  @ApiProperty({ description: 'Whether a consultation note has been signed.' })
  hasNote!: boolean;

  @ApiProperty()
  prescriptionCount!: number;
}
