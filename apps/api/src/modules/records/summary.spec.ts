import { describe, expect, it } from 'vitest';
import { buildSummaryPrompt, SUMMARY_SYSTEM_PROMPT } from './summary.prompt';
import { isSummaryCurrent } from './summary.staleness';

const note = {
  findings: 'Dry cough for five days, chest clear on examination.',
  diagnosis: 'Viral upper respiratory tract infection.',
  recommendations: 'Rest, fluids, paracetamol as needed.',
  followUp: 'Return if a fever develops.',
};

describe('buildSummaryPrompt', () => {
  it('includes every field of the signed note', () => {
    const prompt = buildSummaryPrompt(note, []);
    expect(prompt).toContain(note.findings);
    expect(prompt).toContain(note.diagnosis);
    expect(prompt).toContain(note.recommendations);
    expect(prompt).toContain(note.followUp);
  });

  it('omits the follow-up line when there is none', () => {
    expect(buildSummaryPrompt({ ...note, followUp: null }, [])).not.toContain('Follow-up:');
  });

  it('includes the appointment prescriptions', () => {
    const prompt = buildSummaryPrompt(note, [
      {
        medication: 'Paracetamol',
        dosage: '500mg',
        frequency: 'every 6 hours',
        durationDays: 5,
        instructions: 'Take with food.',
      },
    ]);
    expect(prompt).toContain('Paracetamol');
    expect(prompt).toContain('500mg');
    expect(prompt).toContain('every 6 hours');
    expect(prompt).toContain('5 days');
    expect(prompt).toContain('Take with food.');
  });

  it('cannot carry transcript text, because it takes no transcript', () => {
    // The guarantee is structural: the builder's parameters are the note and
    // its prescriptions. There is no argument through which a message could
    // reach the prompt, so a transcript line cannot appear in the output.
    const prompt = buildSummaryPrompt(note, []);
    expect(prompt).not.toContain('Patient:');
    expect(prompt).not.toContain('Doctor:');
    expect(buildSummaryPrompt.length).toBe(2);
  });

  it('instructs the model to add nothing', () => {
    expect(SUMMARY_SYSTEM_PROMPT).toContain('Add nothing');
    expect(prompt_mentions_no_additions(buildSummaryPrompt(note, []))).toBe(true);
  });
});

function prompt_mentions_no_additions(prompt: string): boolean {
  return prompt.includes('Add nothing that is not written above.');
}

describe('isSummaryCurrent', () => {
  const updatedAt = new Date('2026-09-20T10:00:00.000Z');

  it('is current when the summary explains this version of the note', () => {
    expect(isSummaryCurrent({ noteUpdatedAt: new Date(updatedAt) }, { updatedAt })).toBe(true);
  });

  it('is stale once the note has been revised', () => {
    const revised = new Date('2026-09-21T09:00:00.000Z');
    expect(isSummaryCurrent({ noteUpdatedAt: updatedAt }, { updatedAt: revised })).toBe(false);
  });

  it('is not current when there is no summary', () => {
    expect(isSummaryCurrent(null, { updatedAt })).toBe(false);
    expect(isSummaryCurrent(undefined, { updatedAt })).toBe(false);
  });

  it('is not current when there is no note', () => {
    expect(isSummaryCurrent({ noteUpdatedAt: updatedAt }, null)).toBe(false);
  });
});
