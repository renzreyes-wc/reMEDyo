import {
  DRAFT_MIN_MESSAGES,
  DRAFT_MIN_MESSAGES_PER_PARTICIPANT,
  DRAFT_MIN_TRANSCRIPT_CHARS,
} from '@remedyo/shared';

/**
 * Thin-transcript detection and the drafting prompt.
 *
 * Both pure, so they are testable without a model and without a database, and
 * both operate on rows the caller has already loaded for one appointment.
 */

export interface TranscriptMessage {
  id: string;
  senderId: string;
  senderName: string;
  body: string;
  sentAt: Date;
}

export interface DraftClinicalContext {
  age: number | null;
  allergies: string[];
  medications: string[];
  conditions: string[];
}

export interface DraftAppointmentMeta {
  reasonForVisit: string;
  startsAt: Date;
}

export type ThinTranscriptReason = 'transcript-empty' | 'transcript-too-thin';

/**
 * Why this runs before any model call: the refusal is then deterministic,
 * testable without a model, and free. A session with two messages has nothing
 * to summarise, and a confidently invented note is the worst possible output
 * here — so the cheapest guard is the most important one.
 */
export function assessTranscript(
  messages: TranscriptMessage[],
  doctorUserId: string,
): ThinTranscriptReason | null {
  if (messages.length === 0) return 'transcript-empty';

  if (messages.length < DRAFT_MIN_MESSAGES) return 'transcript-too-thin';

  const fromDoctor = messages.filter((m) => m.senderId === doctorUserId).length;
  const fromPatient = messages.length - fromDoctor;

  if (
    fromDoctor < DRAFT_MIN_MESSAGES_PER_PARTICIPANT ||
    fromPatient < DRAFT_MIN_MESSAGES_PER_PARTICIPANT
  ) {
    return 'transcript-too-thin';
  }

  const totalChars = messages.reduce((sum, m) => sum + m.body.trim().length, 0);
  if (totalChars < DRAFT_MIN_TRANSCRIPT_CHARS) return 'transcript-too-thin';

  return null;
}

export const DRAFT_SYSTEM_PROMPT = [
  'You draft a consultation note from the transcript of one consultation, for the doctor who held it to review and edit.',
  '',
  'Rules you must follow:',
  '- Write only what the transcript supports. Add no finding, diagnosis or recommendation that was not discussed.',
  '- Do not invent measurements, test results, or examination findings. This was a text consultation.',
  '- Where the transcript is vague, be vague. Do not resolve uncertainty on the doctor\'s behalf.',
  '- Write in clinical register, in the third person, as a doctor writing their own note.',
  '- Do not address the patient and do not give advice of your own.',
  '',
  'You do NOT decide on treatment. The "prescriptions" list below is not a',
  'recommendation of yours: list an entry ONLY where a message marked [doctor]',
  'already states a medication with its dose, frequency and duration. Quote that',
  'message verbatim in "excerpt" and give its id in "sourceMessageId". If no such',
  'message exists, return an empty list. Never list a medication the patient',
  'mentioned, and never complete missing details yourself.',
  '',
  'Reply with JSON only, in the form:',
  '{"findings": "...", "diagnosis": "...", "recommendations": "...", "followUp": "...",',
  ' "prescriptions": [{"medication": "...", "dosage": "...", "frequency": "...",',
  '  "durationDays": 30, "instructions": "...", "sourceMessageId": "...", "excerpt": "..."}]}',
  'Use an empty string for followUp if the transcript suggests none.',
].join('\n');

/**
 * Builds the drafting prompt.
 *
 * Takes one appointment's messages, the clinical context already assembled
 * for that appointment's doctor, and that appointment's own metadata. There
 * is no parameter through which another patient's or another appointment's
 * data could arrive.
 */
export function buildDraftPrompt(
  messages: TranscriptMessage[],
  clinicalContext: DraftClinicalContext | undefined,
  appointment: DraftAppointmentMeta,
  doctorUserId: string,
): string {
  const lines = ['CONSULTATION', `Reason for visit: ${appointment.reasonForVisit}`];

  if (clinicalContext) {
    lines.push('', 'PATIENT CONTEXT');
    if (clinicalContext.age !== null) lines.push(`Age: ${clinicalContext.age}`);
    lines.push(`Allergies: ${list(clinicalContext.allergies)}`);
    lines.push(`Current medications: ${list(clinicalContext.medications)}`);
    lines.push(`Chronic conditions: ${list(clinicalContext.conditions)}`);
  }

  // Each line carries its id and who said it, so a prescription citation can
  // name a message the server can then verify the excerpt against.
  lines.push('', 'TRANSCRIPT');
  for (const message of messages) {
    const role = message.senderId === doctorUserId ? 'doctor' : 'patient';
    lines.push(`[${role}] (id: ${message.id}) ${message.senderName}: ${message.body}`);
  }

  lines.push(
    '',
    'Draft this consultation note. Include nothing that is not supported by the transcript above.',
  );

  return lines.join('\n');
}

function list(values: string[]): string {
  return values.length > 0 ? values.join(', ') : 'none recorded';
}
