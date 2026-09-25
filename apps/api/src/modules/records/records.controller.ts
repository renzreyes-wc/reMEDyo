import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import type {
  AssistAvailability,
  ConsultationNote,
  MedicalRecordEntry,
  NoteDraft,
  NoteDraftResult,
  Prescription,
} from '@remedyo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthUser } from '../../common/types';
import { CreatePrescriptionDto, UpsertNoteDto } from './dto/records.dto';
import {
  AssistAvailabilityDto,
  ConsultationNoteDto,
  DraftedNoteResultDto,
  MedicalRecordEntryDto,
  NoteDraftDto,
  PrescriptionDto,
  RefusedNoteResultDto,
} from './dto/records.response';
import { RecordsService } from './records.service';

/**
 * Note there is deliberately no DELETE anywhere in this controller.
 *
 * The medical-records spec requires notes and prescriptions to be retained;
 * corrections are revisions. The absence of the route is the enforcement.
 */
@ApiTags('records')
@Controller('records')
export class RecordsController {
  constructor(private readonly records: RecordsService) {}

  @Roles('PATIENT')
  @ApiOperation({
    summary: 'The calling patient’s own record',
    description: 'Every consultation the caller attended, with its note, prescriptions and summary.',
  })
  @ApiOkResponse({ description: 'The caller’s record entries.', type: [MedicalRecordEntryDto] })
  @Get('me')
  mine(@CurrentUser() user: AuthUser): Promise<MedicalRecordEntry[]> {
    return this.records.myRecords(user);
  }

  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'A patient’s record, as a doctor sees it',
    description:
      'Refused unless the calling doctor is a participant in one of that patient’s consultations.',
  })
  @ApiParam({ name: 'patientId', description: 'The patient profile id, not the user id.' })
  @ApiOkResponse({ description: 'That patient’s record entries.', type: [MedicalRecordEntryDto] })
  @Get('patients/:patientId')
  patient(
    @CurrentUser() user: AuthUser,
    @Param('patientId') patientId: string,
  ): Promise<MedicalRecordEntry[]> {
    return this.records.patientRecordsForDoctor(user, patientId);
  }

  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({
    summary: 'The record entry for one appointment',
    description: 'Both participants may read it. The summary is withheld while it is stale.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the record entry belongs to.' })
  @ApiOkResponse({ description: 'The note, prescriptions and summary.', type: MedicalRecordEntryDto })
  @Get('appointments/:appointmentId')
  forAppointment(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<MedicalRecordEntry> {
    return this.records.recordForAppointment(user, appointmentId);
  }

  /**
   * Whether assistance is on offer at all. Authenticated, and deliberately
   * not public: it says something about this deployment's configuration.
   */
  @Roles('PATIENT', 'DOCTOR')
  @ApiOperation({
    summary: 'Whether clinical assist is available',
    description:
      'Authenticated on purpose: the answer says something about this deployment’s configuration, so it is not public.',
  })
  @ApiOkResponse({ description: 'Availability, and the model that would answer.', type: AssistAvailabilityDto })
  @Get('assist')
  assist(): AssistAvailability {
    return this.records.assistAvailability();
  }

  /**
   * The draft already generated for this appointment, so reloading the form
   * does not cost a second generation.
   */
  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'The draft already generated for an appointment',
    description: 'Null when none has been generated, so reloading the form costs nothing.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment the draft belongs to.' })
  @ApiOkResponse({
    description: 'The stored draft, or null.',
    schema: { oneOf: [{ $ref: getSchemaPath(NoteDraftDto) }, { type: 'null' }] },
  })
  @Get('appointments/:appointmentId/draft')
  draft(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<NoteDraft | null> {
    return this.records.existingDraft(user, appointmentId);
  }

  /**
   * Generate a draft from this consultation's transcript.
   *
   * Returns a refusal rather than an error when the transcript is too thin or
   * assistance is unavailable: both are ordinary outcomes, not failures.
   */
  @Roles('DOCTOR')
  @ApiExtraModels(DraftedNoteResultDto, RefusedNoteResultDto)
  @ApiOperation({
    summary: 'Generate a note draft from the transcript',
    description:
      'Generated scaffolding, not the record: it pre-fills the form and nothing else, and the doctor’s own save remains the only writer. A refusal — a transcript too thin to draft from, or assistance unavailable — is a 201 carrying `status: "refused"`, not an error.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment to draft from.' })
  @ApiCreatedResponse({
    description: 'A draft, or the reason none was produced.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(DraftedNoteResultDto) },
        { $ref: getSchemaPath(RefusedNoteResultDto) },
      ],
    },
  })
  @Post('appointments/:appointmentId/draft')
  generateDraft(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
  ): Promise<NoteDraftResult> {
    return this.records.draftNote(user, appointmentId);
  }

  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'Sign or revise the consultation note',
    description:
      'Only a doctor who took part in the consultation may write the note. Saving again revises it: notes are never deleted, and an earlier version is superseded rather than removed.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment being written up.' })
  @ApiOkResponse({ description: 'The note as saved.', type: ConsultationNoteDto })
  @Put('appointments/:appointmentId/note')
  upsertNote(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: UpsertNoteDto,
  ): Promise<ConsultationNote> {
    return this.records.upsertNote(user, appointmentId, dto);
  }

  @Roles('DOCTOR')
  @ApiOperation({
    summary: 'Add a prescription',
    description:
      'Only a doctor who took part in the consultation may prescribe. Prescriptions are retained, never deleted.',
  })
  @ApiParam({ name: 'appointmentId', description: 'The appointment being prescribed for.' })
  @ApiCreatedResponse({ description: 'The prescription as issued.', type: PrescriptionDto })
  @Post('appointments/:appointmentId/prescriptions')
  addPrescription(
    @CurrentUser() user: AuthUser,
    @Param('appointmentId') appointmentId: string,
    @Body() dto: CreatePrescriptionDto,
  ): Promise<Prescription> {
    return this.records.addPrescription(user, appointmentId, dto);
  }
}
