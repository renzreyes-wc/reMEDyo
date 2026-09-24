/**
 * Whether a stored summary still explains the note it was generated from.
 *
 * The whole staleness mechanism, and deliberately this small: the summary
 * carries the note's `updatedAt` from when it was generated, so a revision
 * moves the note's timestamp and this comparison fails on the next read. No
 * version counter, no invalidation hook, no cleanup job — and nothing is
 * deleted, which is what the system requires.
 */

export interface StoredSummary {
  noteUpdatedAt: Date;
}

export interface SummarisedNote {
  updatedAt: Date;
}

export function isSummaryCurrent(
  summary: StoredSummary | null | undefined,
  note: SummarisedNote | null | undefined,
): boolean {
  if (!summary || !note) return false;
  return summary.noteUpdatedAt.getTime() === note.updatedAt.getTime();
}
