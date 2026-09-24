import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import type { NoteDraft, NoteDraftResult } from '@remedyo/shared';
import { PrismaService } from '../../common/prisma.service';
import { ConsultationsService } from '../consultations/consultations.service';
import { LlmProvider } from '../llm/llm.provider';
import { validateNoteDraft } from '../llm/output';
import { assessTranscript, buildDraftPrompt, DRAFT_SYSTEM_PROMPT } from './draft';
import { verifyCandidates, type ExtractionCandidate } from './extraction';

/**
 * Generation of the doctor's note draft.
 *
 * Authorisation happens before this is reached: RecordsService establishes
 * that the caller is the authoring clinician on a completed appointment.
 * What this owns is the refusal, the prompt, the verification and the store.
 */
@Injectable()
export class DraftService {
  private readonly logger = new Logger(DraftService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly consultations: ConsultationsService,
    private readonly llm: LlmProvider,
  ) {}

  /** The stored draft, so a reload does not cost a second generation. */
  async existing(appointmentId: string): Promise<NoteDraft | null> {
    const draft = await this.prisma.consultationNoteDraft.findUnique({
      where: { appointmentId },
    });
    return draft ? this.toDto(draft) : null;
  }

  async generate(
    appointmentId: string,
    patientId: string,
    doctorUserId: string,
    reasonForVisit: string,
    startsAt: Date,
  ): Promise<NoteDraftResult> {
    const { messages, clinicalContext } = await this.consultations.draftingContext(
      appointmentId,
      patientId,
    );

    // Before any model call: deterministic, testable without a model, and
    // free. An empty transcript costs nothing to refuse, and refusing is far
    // better than a confidently invented note.
    const thin = assessTranscript(messages, doctorUserId);
    if (thin) return { status: 'refused', reason: thin };

    if (!this.llm.isEnabled()) return { status: 'refused', reason: 'unavailable' };

    const result = await this.llm.generate({
      system: DRAFT_SYSTEM_PROMPT,
      prompt: buildDraftPrompt(
        messages,
        clinicalContext,
        { reasonForVisit, startsAt },
        doctorUserId,
      ),
    });

    if (!result.ok) {
      this.logger.log(`Draft unavailable for ${appointmentId}: ${result.reason}.`);
      return { status: 'refused', reason: 'unavailable' };
    }

    const validated = validateNoteDraft(result.text);
    if (!validated) {
      this.logger.warn(`Draft for ${appointmentId} failed structural validation.`);
      return { status: 'refused', reason: 'unavailable' };
    }

    // Candidates are verified against the doctor's own messages before they
    // are stored or returned. A fabricated dose cannot survive this.
    const parsed = JSON.parse(result.text) as { prescriptions?: unknown };
    const candidates = verifyCandidates(parsed.prescriptions, messages, doctorUserId);

    const stored = await this.prisma.$transaction(async (tx) => {
      // One draft per appointment: regeneration supersedes, nothing is
      // deleted, and the generation history lives in the audit log.
      const saved = await tx.consultationNoteDraft.upsert({
        where: { appointmentId },
        update: {
          ...validated,
          extractionCandidates: candidates as unknown as object,
          model: result.model,
          generatedAt: new Date(),
        },
        create: {
          appointmentId,
          ...validated,
          extractionCandidates: candidates as unknown as object,
          model: result.model,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: doctorUserId,
          action: AuditAction.NOTE_DRAFT_GENERATED,
          targetType: 'Appointment',
          targetId: appointmentId,
          reason: result.model,
        },
      });

      return saved;
    });

    return { status: 'drafted', draft: this.toDto(stored) };
  }

  private toDto(row: {
    findings: string;
    diagnosis: string;
    recommendations: string;
    followUp: string | null;
    extractionCandidates: unknown;
    model: string;
    generatedAt: Date;
  }): NoteDraft {
    return {
      findings: row.findings,
      diagnosis: row.diagnosis,
      recommendations: row.recommendations,
      followUp: row.followUp,
      extractionCandidates: (row.extractionCandidates ?? []) as ExtractionCandidate[],
      model: row.model,
      generatedAt: row.generatedAt.toISOString(),
    };
  }
}
