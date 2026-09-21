import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type {
  ConsultationNote,
  MedicalRecordEntry,
  Prescription,
} from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import type { AuthUser } from '../../common/types';
import { AppointmentsService } from '../appointments/appointments.service';
import { APPOINTMENT_INCLUDE, toAppointmentDto } from '../appointments/appointments.mapper';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePrescriptionDto, UpsertNoteDto } from './dto/records.dto';

@Injectable()
export class RecordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  /** The patient's own history: every appointment with what it produced. */
  async myRecords(user: AuthUser): Promise<MedicalRecordEntry[]> {
    const patient = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient profile not found.');

    return this.recordsForPatient(patient.id);
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
    return this.recordsForPatient(patientId);
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
        },
        create: {
          appointmentId,
          findings: dto.findings.trim(),
          diagnosis: dto.diagnosis.trim(),
          recommendations: dto.recommendations.trim(),
          followUp: dto.followUp?.trim() || null,
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

    const [note, prescriptions] = await Promise.all([
      this.prisma.consultationNote.findUnique({ where: { appointmentId } }),
      this.prisma.prescription.findMany({
        where: { appointmentId },
        orderBy: { issuedAt: 'asc' },
      }),
    ]);

    const prescriber = `Dr. ${appointment.doctor.fullName}`;

    return {
      appointment: toAppointmentDto(appointment),
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

  private async recordsForPatient(patientId: string): Promise<MedicalRecordEntry[]> {
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      include: {
        ...APPOINTMENT_INCLUDE,
        note: true,
        prescriptions: { orderBy: { issuedAt: 'asc' } },
      },
      orderBy: { startsAt: 'desc' },
    });

    return appointments.map((a) => {
      const prescriber = `Dr. ${a.doctor.fullName}`;
      return {
        appointment: toAppointmentDto(a),
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
