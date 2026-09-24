import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { LlmProvider } from '../llm/llm.provider';
import { validateSummary } from '../llm/output';
import { buildSummaryPrompt, SUMMARY_SYSTEM_PROMPT } from './summary.prompt';

/**
 * Generation of the patient-facing plain-language summary.
 *
 * Never awaited by a request. `upsertNote` starts it after its transaction
 * commits and the records read starts it when it finds the summary missing or
 * stale — in both cases detached, because a 10-second generation must never
 * be in the path of a clinical write or a patient's list.
 *
 * Every failure is swallowed into a log line. There is nothing a caller could
 * usefully do with it: the note is already saved, the read already returned,
 * and an absent summary is a correct state.
 */
@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  /** Appointments with a generation in flight, so a burst of reads starts one. */
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: LlmProvider,
  ) {}

  /**
   * Start a generation and return immediately.
   *
   * `void` by design: the caller is a request that has already done its work.
   */
  schedule(appointmentId: string, actorId: string): void {
    if (!this.llm.isEnabled()) return;
    if (this.inFlight.has(appointmentId)) return;

    this.inFlight.add(appointmentId);

    void this.generate(appointmentId, actorId)
      .catch((error) => {
        this.logger.warn(
          `Summary generation failed for ${appointmentId}: ${(error as Error).message}`,
        );
      })
      .finally(() => {
        this.inFlight.delete(appointmentId);
      });
  }

  private async generate(appointmentId: string, actorId: string): Promise<void> {
    const note = await this.prisma.consultationNote.findUnique({
      where: { appointmentId },
    });
    // No note is not a failure: there is nothing to explain yet.
    if (!note) return;

    const prescriptions = await this.prisma.prescription.findMany({
      where: { appointmentId },
      orderBy: { issuedAt: 'asc' },
    });

    // The input is the clinician-approved document and nothing else — no
    // transcript, no draft. The prompt builder takes no other parameters.
    const result = await this.llm.generate({
      system: SUMMARY_SYSTEM_PROMPT,
      prompt: buildSummaryPrompt(
        {
          findings: note.findings,
          diagnosis: note.diagnosis,
          recommendations: note.recommendations,
          followUp: note.followUp,
        },
        prescriptions.map((p) => ({
          medication: p.medication,
          dosage: p.dosage,
          frequency: p.frequency,
          durationDays: p.durationDays,
          instructions: p.instructions,
        })),
      ),
    });

    if (!result.ok) {
      this.logger.log(`Summary unavailable for ${appointmentId}: ${result.reason}.`);
      return;
    }

    const summary = validateSummary(result.text);
    if (!summary) {
      this.logger.warn(`Summary for ${appointmentId} failed structural validation.`);
      return;
    }

    // Re-read the note: it may have been revised while the model was working,
    // in which case this generation explains a superseded version and storing
    // it would make a stale summary look current.
    const current = await this.prisma.consultationNote.findUnique({
      where: { appointmentId },
      select: { updatedAt: true },
    });
    if (!current || current.updatedAt.getTime() !== note.updatedAt.getTime()) {
      this.logger.log(`Note ${appointmentId} was revised mid-generation; discarding.`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.consultationNoteSummary.upsert({
        where: { appointmentId },
        update: {
          summary,
          noteUpdatedAt: note.updatedAt,
          model: result.model,
          generatedAt: new Date(),
        },
        create: {
          appointmentId,
          summary,
          noteUpdatedAt: note.updatedAt,
          model: result.model,
        },
      });

      // Insert-only, like every other audit entry.
      await tx.auditLog.create({
        data: {
          actorId,
          action: AuditAction.RECORD_SUMMARY_GENERATED,
          targetType: 'Appointment',
          targetId: appointmentId,
          reason: result.model,
        },
      });
    });
  }
}
