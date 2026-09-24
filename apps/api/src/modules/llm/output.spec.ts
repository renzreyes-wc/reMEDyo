import { describe, expect, it } from 'vitest';
import {
  NOTE_FIELD_LIMITS,
  SUMMARY_LIMIT,
  parseJsonObject,
  truncate,
  validateNoteDraft,
  validateSummary,
} from './output';

describe('parseJsonObject', () => {
  it('rejects malformed JSON', () => {
    expect(parseJsonObject('{"findings": ')).toBeNull();
    expect(parseJsonObject('not json at all')).toBeNull();
    expect(parseJsonObject('')).toBeNull();
  });

  it('rejects JSON that is not an object', () => {
    expect(parseJsonObject('"a string"')).toBeNull();
    expect(parseJsonObject('[1, 2, 3]')).toBeNull();
    expect(parseJsonObject('null')).toBeNull();
    expect(parseJsonObject('42')).toBeNull();
  });

  it('accepts an object', () => {
    expect(parseJsonObject('{"a": 1}')).toEqual({ a: 1 });
  });
});

describe('validateNoteDraft', () => {
  const complete = JSON.stringify({
    findings: 'Patient reports a dry cough for five days.',
    diagnosis: 'Likely viral upper respiratory infection.',
    recommendations: 'Rest and fluids; review if fever develops.',
    followUp: 'Return in one week if unresolved.',
  });

  it('accepts a complete draft', () => {
    const draft = validateNoteDraft(complete);
    expect(draft).not.toBeNull();
    expect(draft!.diagnosis).toBe('Likely viral upper respiratory infection.');
    expect(draft!.followUp).toBe('Return in one week if unresolved.');
  });

  it('treats a missing required key as a failed generation', () => {
    for (const missing of ['findings', 'diagnosis', 'recommendations']) {
      const parsed = JSON.parse(complete);
      delete parsed[missing];
      expect(validateNoteDraft(JSON.stringify(parsed))).toBeNull();
    }
  });

  it('treats an empty required field as missing', () => {
    const parsed = { ...JSON.parse(complete), diagnosis: '   ' };
    expect(validateNoteDraft(JSON.stringify(parsed))).toBeNull();
  });

  it('accepts a draft with no follow-up, which is optional', () => {
    const parsed = JSON.parse(complete);
    delete parsed.followUp;
    expect(validateNoteDraft(JSON.stringify(parsed))!.followUp).toBeNull();
  });

  it('drops unknown keys rather than rejecting the generation', () => {
    const parsed = { ...JSON.parse(complete), confidence: 0.8, chatter: 'Hope this helps!' };
    const draft = validateNoteDraft(JSON.stringify(parsed));
    expect(draft).not.toBeNull();
    expect(Object.keys(draft!).sort()).toEqual([
      'diagnosis',
      'findings',
      'followUp',
      'recommendations',
    ]);
  });

  it('rejects malformed JSON', () => {
    expect(validateNoteDraft('{oops')).toBeNull();
  });

  it('truncates every field to the limit the note form enforces', () => {
    const draft = validateNoteDraft(
      JSON.stringify({
        findings: 'f'.repeat(9000),
        diagnosis: 'd'.repeat(9000),
        recommendations: 'r'.repeat(9000),
        followUp: 'u'.repeat(9000),
      }),
    )!;

    expect(draft.findings.length).toBeLessThanOrEqual(NOTE_FIELD_LIMITS.findings);
    expect(draft.diagnosis.length).toBeLessThanOrEqual(NOTE_FIELD_LIMITS.diagnosis);
    expect(draft.recommendations.length).toBeLessThanOrEqual(
      NOTE_FIELD_LIMITS.recommendations,
    );
    expect(draft.followUp!.length).toBeLessThanOrEqual(NOTE_FIELD_LIMITS.followUp);
  });

  it('ignores non-string values in required fields', () => {
    const parsed = { ...JSON.parse(complete), findings: { text: 'nested' } };
    expect(validateNoteDraft(JSON.stringify(parsed))).toBeNull();
  });
});

describe('validateSummary', () => {
  it('accepts a summary', () => {
    expect(validateSummary('{"summary": "Your doctor found a chest infection."}')).toBe(
      'Your doctor found a chest infection.',
    );
  });

  it('rejects a missing or empty summary', () => {
    expect(validateSummary('{}')).toBeNull();
    expect(validateSummary('{"summary": "  "}')).toBeNull();
    expect(validateSummary('nonsense')).toBeNull();
  });

  it('truncates an over-long summary', () => {
    const long = validateSummary(JSON.stringify({ summary: 's'.repeat(5000) }))!;
    expect(long.length).toBeLessThanOrEqual(SUMMARY_LIMIT);
  });
});

describe('truncate', () => {
  it('leaves a short value alone', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('cuts at a word boundary when one is close to the limit', () => {
    expect(truncate('alpha beta gamma delta', 18)).toBe('alpha beta gamma');
  });
});
