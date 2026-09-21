import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import type {
  ConsultationNote,
  MedicalRecordEntry,
  Prescription,
} from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { CreatePrescriptionDto, UpsertNoteDto } from './dto/records.dto';
import { RecordsService } from './records.service';

/**
 * Note there is deliberately no DELETE anywhere in this controller.
 *
 * The medical-records spec requires notes and prescriptions to be retained;
 * corrections are revisions. The absence of the route is the enforcement.
 */
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Roles('PATIENT')
  @Get('me')
  mine(@CurrentUser() user: AuthUser): Promise<MedicalRecordEntry[]> {
    return this.records.myRecords(user);
  }

  @Roles('DOCTOR')
  @Get('patients/:patientId')
  patient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ): Promise<MedicalRecordEntry[]> {
    return this.records.patientRecordsForDoctor(user, patientId);
  }

  @Roles('PATIENT', 'DOCTOR')
  @Get('appointments/:appointmentId')
  forAppointment(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<MedicalRecordEntry> {
    return this.records.recordForAppointment(user, appointmentId);
  }

  @Roles('DOCTOR')
  @Put('appointments/:appointmentId/note')
  upsertNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpsertNoteDto,
  ): Promise<ConsultationNote> {
    return this.records.upsertNote(user, appointmentId, dto);
  }

  @Roles('DOCTOR')
  @Post('appointments/:appointmentId/prescriptions')
  addPrescription(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreatePrescriptionDto,
  ): Promise<Prescription> {
    return this.records.addPrescription(user, appointmentId, dto);
  }
}
