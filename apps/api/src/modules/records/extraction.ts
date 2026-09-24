import type { TranscriptMessage } from './draft';

/**
 * Prescription extraction, and the guard that makes it safe.
 *
 * A note summarises what was said; a prescription is a new clinical decision
 * that is not in the transcript. So nothing here creates a prescription. The
 * only permitted move is *extraction*: where the doctor's own message states
 * a medication with its dose, frequency and duration, those values may
 * pre-fill the form.
 *
 * Verification is deterministic and runs on every candidate: the source
 * message must belong to this appointment, must have been sent by the doctor,
 * and the quoted excerpt must occur verbatim in it. A fabricated dose cannot
 * survive that, because the fabricated excerpt will not be found. That is
 * what turns the prohibition from a prompt instruction into a property.
 */

export interface ExtractionCandidate {
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
  sourceMessageId: string;
  /** The words in the doctor's message these values were read from. */
  excerpt: string;
}

/** Normalise whitespace so a reflowed quotation still matches its source. */
function normalise(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Keep only candidates that can be traced to a doctor's message in this
 * appointment. Anything else is discarded silently — a candidate the system
 * cannot stand behind is simply not offered.
 */
export function verifyCandidates(
  candidates: unknown,
  messages: TranscriptMessage[],
  doctorUserId: string,
): ExtractionCandidate[] {
  if (!Array.isArray(candidates)) return [];

  const byId = new Map(messages.map((m) => [m.id, m]));

  const verified: ExtractionCandidate[] = [];

  for (const raw of candidates) {
    const candidate = asCandidate(raw);
    if (!candidate) continue;

    // (a) the message belongs to this appointment
    const source = byId.get(candidate.sourceMessageId);
    if (!source) continue;

    // (b) it was the doctor who said it
    if (source.senderId !== doctorUserId) continue;

    // (c) the excerpt is actually in it
    if (!normalise(source.body).includes(normalise(candidate.excerpt))) continue;

    verified.push(candidate);
  }

  return verified;
}

function asCandidate(raw: unknown): ExtractionCandidate | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;

  const text = (key: string): string | null => {
    const v = value[key];
    return typeof v === 'string' && v.trim() ? v.trim() : null;
  };

  const medication = text('medication');
  const dosage = text('dosage');
  const frequency = text('frequency');
  const sourceMessageId = text('sourceMessageId');
  const excerpt = text('excerpt');

  // Every field the prescription form requires must be present. A partial
  // extraction is not a pre-fill, it is a guess.
  if (!medication || !dosage || !frequency || !sourceMessageId || !excerpt) return null;

  const durationDays = Number(value.durationDays);
  if (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365) {
    return null;
  }

  return {
    medication,
    dosage,
    frequency,
    durationDays,
    instructions: text('instructions'),
    sourceMessageId,
    excerpt,
  };
}
