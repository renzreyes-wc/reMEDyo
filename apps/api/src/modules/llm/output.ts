/**
 * Structural validation of a generation.
 *
 * Pure, so it is testable without a model and without a database. It checks
 * *shape*, not clinical content — no automated check can do the latter, and
 * claiming one would be the dishonest move. The safety argument is the
 * clinician's sign-off and the labelling; this only guarantees that what
 * comes back is something the existing form could actually save.
 */

/** Field limits, mirroring what UpsertNoteDto already enforces. */
export const NOTE_FIELD_LIMITS = {
  findings: 4000,
  diagnosis: 2000,
  recommendations: 4000,
  followUp: 1000,
} as const;

export type ParsedObject = Record<string, unknown>;

/**
 * Parse a model response into a plain object.
 *
 * Returns null for anything that is not a JSON object — malformed JSON, a
 * bare string, an array, or null. A failed parse is a failed generation.
 */
export function parseJsonObject(text: string): ParsedObject | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  return value as ParsedObject;
}

/**
 * Keep only the named keys whose values are strings, trimmed.
 *
 * Unknown keys are dropped rather than rejected: a small model adding a
 * chatty "notes" field should not throw away an otherwise usable generation.
 */
export function pickStringFields(
  parsed: ParsedObject,
  keys: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
    }
  }
  return out;
}

/** Truncate to a limit at a word boundary where one is close enough. */
export function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > limit - 40 ? cut.slice(0, lastSpace) : cut;
}

export interface ValidatedNoteDraft {
  findings: string;
  diagnosis: string;
  recommendations: string;
  followUp: string | null;
}

/**
 * Validate a generated note draft.
 *
 * The three required fields must be present and non-empty; a missing one is a
 * failed generation rather than a draft with a hole in it, because a draft
 * the form cannot save is worse than no draft. Every field is truncated to
 * the limit the form already enforces.
 */
export function validateNoteDraft(text: string): ValidatedNoteDraft | null {
  const parsed = parseJsonObject(text);
  if (!parsed) return null;

  const fields = pickStringFields(parsed, [
    'findings',
    'diagnosis',
    'recommendations',
    'followUp',
  ]);

  if (!fields.findings || !fields.diagnosis || !fields.recommendations) {
    return null;
  }

  return {
    findings: truncate(fields.findings, NOTE_FIELD_LIMITS.findings),
    diagnosis: truncate(fields.diagnosis, NOTE_FIELD_LIMITS.diagnosis),
    recommendations: truncate(fields.recommendations, NOTE_FIELD_LIMITS.recommendations),
    followUp: fields.followUp
      ? truncate(fields.followUp, NOTE_FIELD_LIMITS.followUp)
      : null,
  };
}

/** Limit on a patient-facing summary. Long enough to explain, short enough to read. */
export const SUMMARY_LIMIT = 2000;

/** Validate a generated plain-language summary. */
export function validateSummary(text: string): string | null {
  const parsed = parseJsonObject(text);
  if (!parsed) return null;

  const fields = pickStringFields(parsed, ['summary']);
  if (!fields.summary) return null;

  return truncate(fields.summary, SUMMARY_LIMIT);
}
