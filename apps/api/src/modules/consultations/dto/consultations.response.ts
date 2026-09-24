import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SessionState,
  type ConsultationContext,
  type ConsultationMessage,
} from '@remedyo/shared';
import { AppointmentDto } from '../../appointments/dto/appointment.response';

/**
 * Response models for the consultation surface (design D7). Each class
 * `implements` the `@remedyo/shared` type it mirrors.
 */

export class ConsultationMessageDto implements ConsultationMessage {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ format: 'uuid' })
  senderId!: string;

  @ApiProperty()
  senderName!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty({ format: 'date-time' })
  sentAt!: string;
}

/** The patient's history, as the doctor sees it beside the thread. */
type ClinicalContext = NonNullable<ConsultationContext['clinicalContext']>;

export class ClinicalContextDto implements ClinicalContext {
  @ApiProperty({ nullable: true })
  age!: number | null;

  @ApiProperty({ type: [String], nullable: true })
  allergies!: string[];

  @ApiProperty({ type: [String], nullable: true })
  medications!: string[];

  @ApiProperty({ type: [String], nullable: true })
  conditions!: string[];
}

export class ConsultationContextDto implements ConsultationContext {
  @ApiProperty({ type: AppointmentDto })
  appointment!: AppointmentDto;

  @ApiProperty({ enum: SessionState })
  sessionState!: SessionState;

  @ApiProperty({ format: 'date-time', nullable: true })
  patientJoinedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  doctorJoinedAt!: string | null;

  @ApiProperty({ description: 'Whether the join window is open for this caller right now.' })
  joinable!: boolean;

  @ApiProperty({ type: [ConsultationMessageDto] })
  messages!: ConsultationMessageDto[];

  @ApiPropertyOptional({
    type: ClinicalContextDto,
    description: 'Populated for the doctor only. A patient never receives this.',
  })
  clinicalContext?: ClinicalContextDto;
}
