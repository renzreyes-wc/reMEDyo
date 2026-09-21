/**
 * Slot derivation.
 *
 * Bookable slots are computed, never stored. Storing them would mean a
 * generation job and a drift problem; deriving them means a doctor's schedule
 * change is visible on the very next read, with nothing to reconcile.
 *
 * This file is deliberately pure — plain data in, plain data out, no Prisma and
 * no clock of its own. That is what makes the trickiest logic in the system
 * directly testable, which is where the test budget goes.
 */

export interface WindowSpec {
  /** 0 = Sunday .. 6 = Saturday */
  dayOfWeek: number;
  /** Minutes from midnight. 540 = 09:00. */
  startMinute: number;
  endMinute: number;
}

export interface DeriveSlotsInput {
  windows: WindowSpec[];
  /** Dates the doctor blocked out, as local YYYY-MM-DD keys. */
  exceptionDates: Set<string>;
  /** Start instants already held by an active appointment, as epoch millis. */
  bookedStarts: Set<number>;
  /** Inclusive lower bound of the range to expand. */
  from: Date;
  /** Exclusive upper bound. */
  to: Date;
  /** Anything starting at or before this is in the past and not offered. */
  now: Date;
  slotMinutes: number;
}

/** Local-date key, matching how availability exceptions are compared. */
export function dateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Expands recurring weekly windows over a date range, then subtracts every
 * reason a slot is not actually offerable:
 *
 *   - it lies in the past,
 *   - its date is blocked by an availability exception,
 *   - an active appointment already holds it.
 *
 * A partial trailing slot is never emitted: a 09:00–10:15 window at 30 minutes
 * yields 09:00 and 09:30, not a 10:00 that would run past the window.
 */
export function deriveSlots(input: DeriveSlotsInput): Date[] {
  const { windows, exceptionDates, bookedStarts, from, to, now, slotMinutes } = input;

  if (windows.length === 0 || slotMinutes <= 0) return [];

  const windowsByDay = new Map<number, WindowSpec[]>();
  for (const w of windows) {
    if (w.endMinute <= w.startMinute) continue;
    const list = windowsByDay.get(w.dayOfWeek) ?? [];
    list.push(w);
    windowsByDay.set(w.dayOfWeek, list);
  }

  const slots: Date[] = [];

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor < to) {
    const dayWindows = windowsByDay.get(cursor.getDay());

    if (dayWindows && !exceptionDates.has(dateKey(cursor))) {
      for (const w of dayWindows) {
        for (
          let minute = w.startMinute;
          minute + slotMinutes <= w.endMinute;
          minute += slotMinutes
        ) {
          const start = new Date(cursor);
          start.setHours(0, minute, 0, 0);

          if (start >= to) continue;
          if (start <= now) continue;
          if (bookedStarts.has(start.getTime())) continue;

          slots.push(start);
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** Rejects inverted windows and overlaps on the same weekday. */
export function findWindowConflict(
  candidate: WindowSpec,
  existing: WindowSpec[],
): WindowSpec | null {
  for (const w of existing) {
    if (w.dayOfWeek !== candidate.dayOfWeek) continue;
    const overlaps =
      candidate.startMinute < w.endMinute && w.startMinute < candidate.endMinute;
    if (overlaps) return w;
  }
  return null;
}
