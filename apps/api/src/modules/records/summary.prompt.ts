/**
 * The patient-facing summary prompt.
 *
 * Pure, and deliberately narrow in what it will accept: the signed note and
 * that appointment's prescriptions. The transcript and the AI draft are not
 * parameters, so there is no way to pass them — the input is the
 * clinician-approved document, and that is enforced by the signature rather
 * than by remembering not to.
 */

export interface SummaryNoteInput {
  findings: string;
  diagnosis: string;
  recommendations: string;
  followUp: string | null;
}

export interface SummaryPrescriptionInput {
  medication: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  instructions: string | null;
}

export const SUMMARY_SYSTEM_PROMPT = [
  'You rewrite a doctor\'s consultation note into plain language for the patient it is about.',
  '',
  'Rules you must follow:',
  '- Explain only what the note and prescriptions below say. Add nothing.',
  '- Introduce no diagnosis, instruction, dose, medicine or recommendation that is not written above.',
  '- Do not give advice of your own and do not speculate about causes or outcomes.',
  '- Do not tell the patient to stop, start or change any treatment.',
  '- Use short sentences and everyday words. Expand medical terms the note uses.',
  '- Write in the second person ("your doctor found...").',
  '- If the note is brief, your summary is brief. Do not pad it.',
  '',
  'Reply with JSON only, in the form {"summary": "..."}.',
].join('\n');

export function buildSummaryPrompt(
  note: SummaryNoteInput,
  prescriptions: SummaryPrescriptionInput[],
): string {
  const lines = [
    'CONSULTATION NOTE',
    '',
    `Findings: ${note.findings}`,
    `Diagnosis: ${note.diagnosis}`,
    `Recommendations: ${note.recommendations}`,
  ];

  if (note.followUp) lines.push(`Follow-up: ${note.followUp}`);

  if (prescriptions.length > 0) {
    lines.push('', 'PRESCRIPTIONS');
    for (const p of prescriptions) {
      const instructions = p.instructions ? ` — ${p.instructions}` : '';
      lines.push(
        `- ${p.medication}, ${p.dosage}, ${p.frequency}, for ${p.durationDays} days${instructions}`,
      );
    }
  }

  lines.push(
    '',
    'Rewrite the above in plain language for the patient. Add nothing that is not written above.',
  );

  return lines.join('\n');
}
