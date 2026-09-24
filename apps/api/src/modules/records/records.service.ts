import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type {
  AssistAvailability,
  ConsultationNote,
  MedicalRecordEntry,
  NoteDraft,
  NoteDraftResult,
  Prescription,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/types';
import { AppointmentsService } from '../appointments/appointments.service';
import { APPOINTMENT_INCLUDE, toAppointmentDto } from '../appointments/appointments.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto, UpsertNoteDto } from './dto/records.dto';
import { DraftService } from './draft.service';
import { LlmProvider } from '../llm/llm.provider';
import { SummaryService } from './summary.service';
import { isSummaryCurrent } from './summary.staleness';

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly notifications: NotificationsService,
    private readonly summaries: SummaryService,
    private readonly drafts: DraftService,
    private readonly llm: LlmProvider,
  ) {}

  /**
   * Whether assistance is on offer, so the web can decide whether to render
   * the draft action at all rather than a button that always fails.
   */
  assistAvailability(): AssistAvailability {
    return {
      enabled: this.llm.isEnabled(),
      model: this.llm.isEnabled() ? this.llm.modelName() : null,
    };
  }

  /**
   * Generate a draft of the note from this consultation's own transcript.
   *
   * Doctor-initiated and never automatic on completion: a session with two
   * messages has nothing to summarise, and generation should follow the
   * clinician's intent rather than a state transition.
   */
  async draftNote(user: AuthUser, appointmentId: string): Promise<NoteDraftResult> {
    const appointment = await this.requireAuthoringDoctor(user, appointmentId);

    if (appointment.state !== 'COMPLETED') {
      throw new BadRequestException(
        'Complete the consultation before drafting its notes.',
      );
    }

    return this.drafts.generate(
      appointmentId,
      appointment.patientId,
      user.id,
      appointment.reasonForVisit,
      appointment.startsAt,
    );
  }

  /** The draft already generated for this appointment, if there is one. */
  async existingDraft(user: AuthUser, appointmentId: string): Promise<NoteDraft | null> {
    await this.requireAuthoringDoctor(user, appointmentId);
    return this.drafts.existing(appointmentId);
  }

  /** The patient's own history: every appointment with what it produced. */
  async myRecords(user: AuthUser): Promise<MedicalRecordEntry[]> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    return this.recordsForPatient(patient.id, user.id);
  }

  /**
   * A doctor reading a patient's record.
   *
   * Permitted only where this doctor holds at least one appointment with that
   * patient, past or upcoming. The relationship is the authorisation — which
   * is why booking a first appointment is what grants access, and why the
   * check is a query rather than a role.
   */
  async patientRecordsForDoctor(
    user: AuthUser,
    patientId: string,
  ): Promise<MedicalRecordEntry[]> {
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found.');

    const relationship = await this.prisma.appointment.findFirst({
      where: { doctorId: doctor.id, patientId },
      select: { id: true },
    });

    if (!relationship) {
      throw new NotFoundException('That patient record is not available to you.');
    }

    // Once the relationship exists the whole record is visible, including
    // entries authored by other doctors — that is the point of a shared record.
    return this.recordsForPatient(patientId, user.id);
  }

  async upsertNote(
    user: AuthUser,
    appointmentId: string,
    dto: UpsertNoteDto,
  ): Promise<ConsultationNote> {
    const appointment = await this.requireAuthoringDoctor(user, appointmentId);

    if (appointment.state !== 'COMPLETED') {
      throw new BadRequestException(
        'Complete the consultation before recording notes.',
      );
    }

    const existing = await this.prisma.consultationNote.findUnique({
      where: { appointmentId },
    });

    const note = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.consultationNote.upsert({
        where: { appointmentId },
        update: {
          findings: dto.findings.trim(),
          diagnosis: dto.diagnosis.trim(),
          recommendations: dto.recommendations.trim(),
          followUp: dto.followUp?.trim() || null,
          aiAssisted: dto.aiAssisted ?? false,
        },
        create: {
          appointmentId,
          findings: dto.findings.trim(),
          diagnosis: dto.diagnosis.trim(),
          recommendations: dto.recommendations.trim(),
          followUp: dto.followUp?.trim() || null,
          aiAssisted: dto.aiAssisted ?? false,
        },
      });

      // Only announce the first time; a revision is not news to the patient.
      if (!existing) {
        await this.notifications.emit(tx, {
          userId: appointment.patient.userId,
          type: 'RECORDS_AVAILABLE',
          title: 'Your consultation record is ready',
          body: `Dr. ${appointment.doctor.fullName} recorded notes from your consultation.`,
          link: '/patient/records',
        });
      }

      return saved;
    });

    // After the commit, and deliberately not awaited: a generation must never
    // be in the path of the most important write in the product. If it fails,
    // is slow, or the runtime is down, the note is already saved and the
    // patient already notified — only the summary is absent, and the next
    // records read will schedule it again.
    this.summaries.schedule(appointmentId, user.id);

    return {
      id: note.id,
      appointmentId,
      findings: note.findings,
      diagnosis: note.diagnosis,
      recommendations: note.recommendations,
      followUp: note.followUp,
      authorName: `Dr. ${appointment.doctor.fullName}`,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async addPrescription(
    user: AuthUser,
    appointmentId: string,
    dto: CreatePrescriptionDto,
  ): Promise<Prescription> {
    const appointment = await this.requireAuthoringDoctor(user, appointmentId);

    if (appointment.state !== 'COMPLETED') {
      throw new BadRequestException(
        'Complete the consultation before issuing a prescription.',
      );
    }

    const prescription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.prescription.create({
        data: {
          appointmentId,
          medication: dto.medication.trim(),
          dosage: dto.dosage.trim(),
          frequency: dto.frequency.trim(),
          durationDays: dto.durationDays,
          instructions: dto.instructions?.trim() || null,
        },
      });

      await this.notifications.emit(tx, {
        userId: appointment.patient.userId,
        type: 'RECORDS_AVAILABLE',
        title: 'A prescription was added',
        body: `Dr. ${appointment.doctor.fullName} issued a prescription for ${created.medication}.`,
        link: '/patient/records',
      });

      return created;
    });

    return {
      id: prescription.id,
      appointmentId,
      medication: prescription.medication,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      durationDays: prescription.durationDays,
      instructions: prescription.instructions,
      prescriberName: `Dr. ${appointment.doctor.fullName}`,
      issuedAt: prescription.issuedAt.toISOString(),
    };
  }

  /** One appointment's record, for either participant. */
  async recordForAppointment(
    user: AuthUser,
    appointmentId: string,
  ): Promise<MedicalRecordEntry> {
    const appointment = await this.appointments.loadForParticipant(user, appointmentId);

    const [note, prescriptions, summary] = await Promise.all([
      this.prisma.consultationNote.findUnique({ where: { appointmentId } }),
      this.prisma.prescription.findMany({
        where: { appointmentId },
        orderBy: { issuedAt: 'asc' },
      }),
      this.prisma.consultationNoteSummary.findUnique({ where: { appointmentId } }),
    ]);

    const prescriber = `Dr. ${appointment.doctor.fullName}`;
    const current = isSummaryCurrent(summary, note);

    // Repair on read: a generation lost to a restart, a timeout, or a runtime
    // that was down at save time is not lost forever. The read itself never
    // waits on it, so this page keeps exactly today's latency.
    if (note && !current) this.summaries.schedule(appointmentId, user.id);

    return {
      appointment: toAppointmentDto(appointment),
      summary:
        current && summary
          ? {
              summary: summary.summary,
              model: summary.model,
              generatedAt: summary.generatedAt.toISOString(),
            }
          : null,
      note: note
        ? {
            id: note.id,
            appointmentId,
            findings: note.findings,
            diagnosis: note.diagnosis,
            recommendations: note.recommendations,
            followUp: note.followUp,
            authorName: prescriber,
            createdAt: note.createdAt.toISOString(),
            updatedAt: note.updatedAt.toISOString(),
          }
        : null,
      prescriptions: prescriptions.map((p) => ({
        id: p.id,
        appointmentId,
        medication: p.medication,
        dosage: p.dosage,
        frequency: p.frequency,
        durationDays: p.durationDays,
        instructions: p.instructions,
        prescriberName: prescriber,
        issuedAt: p.issuedAt.toISOString(),
      })),
    };
  }

  private async recordsForPatient(
    patientId: string,
    readerId: string,
  ): Promise<MedicalRecordEntry[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        ...APPOINTMENT_INCLUDE,
        note: true,
        noteSummary: true,
        prescriptions: { orderBy: { issuedAt: 'asc' } },
      },
      orderBy: { startsAt: 'desc' },
    });

    // One extra column on a query this already runs: no second call, no
    // loading state, and no model call anywhere on this path.
    for (const a of appointments) {
      if (a.note && !isSummaryCurrent(a.noteSummary, a.note)) {
        this.summaries.schedule(a.id, readerId);
      }
    }

    return appointments.map((a) => {
      const prescriber = `Dr. ${a.doctor.fullName}`;
      const summary = isSummaryCurrent(a.noteSummary, a.note) ? a.noteSummary : null;
      return {
        appointment: toAppointmentDto(a),
        summary: summary
          ? {
              summary: summary.summary,
              model: summary.model,
              generatedAt: summary.generatedAt.toISOString(),
            }
          : null,
        note: a.note
          ? {
              id: a.note.id,
              appointmentId: a.id,
              findings: a.note.findings,
              diagnosis: a.note.diagnosis,
              recommendations: a.note.recommendations,
              followUp: a.note.followUp,
              authorName: prescriber,
              createdAt: a.note.createdAt.toISOString(),
              updatedAt: a.note.updatedAt.toISOString(),
            }
          : null,
        prescriptions: a.prescriptions.map((p) => ({
          id: p.id,
          appointmentId: a.id,
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          durationDays: p.durationDays,
          instructions: p.instructions,
          prescriberName: prescriber,
          issuedAt: p.issuedAt.toISOString(),
        })),
      };
    });
  }

  /** Only the clinician on the appointment may write its record. */
  private async requireAuthoringDoctor(user: AuthUser, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { userId: true, fullName: true } },
        doctor: { select: { userId: true, fullName: true } },
      },
    });

    if (!appointment) throw new NotFoundException('That consultation does not exist.');

    if (user.role !== Role.DOCTOR || appointment.doctor.userId !== user.id) {
      throw new ForbiddenException(
        'Only the doctor who held this consultation can write its record.',
      );
    }

    return appointment;
  }
}
