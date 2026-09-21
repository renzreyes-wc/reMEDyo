import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class BookAppointmentDto {
  @IsString()
  doctorId!: string;

  @IsDateString({}, { message: 'Choose a valid time slot.' })
  startsAt!: string;

  @IsString()
  @MaxLength(500)
  @MinLength(3, { message: 'Tell the doctor briefly why you are booking.' })
  reasonForVisit!: string;
}

export class RescheduleAppointmentDto {
  @IsDateString({}, { message: 'Choose a valid time slot.' })
  startsAt!: string;
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
