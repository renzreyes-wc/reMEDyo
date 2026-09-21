/**
 * Slot derivation is the trickiest pure logic in the system, and the scheduling
 * spec pins its behaviour precisely. That makes it where a small test budget
 * buys the most, so these cases mirror the spec's scenarios directly.
 */

import { describe, expect, it } from 'vitest';
import { dateKey, deriveSlots, findWindowConflict } from './slot-derivation';

/** A fixed Wednesday, so weekday arithmetic in the tests is legible. */
const WEDNESDAY = new Date(2026, 9, 7, 0, 0, 0, 0); // 7 Oct 2026 is a Wednesday
const WEDNESDAY_DOW = WEDNESDAY.getDay();

function at(base: Date, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function baseInput(overrides: Partial<Parameters<typeof deriveSlots>[0]> = {}) {
  return {
    windows: [{ dayOfWeek: WEDNESDAY_DOW, startMinute: 9 * 60, endMinute: 10 * 60 }],
    exceptionDates: new Set<string>(),
    bookedStarts: new Set<number>(),
    from: WEDNESDAY,
    to: new Date(WEDNESDAY.getTime() + 24 * 60 * 60 * 1000),
    now: at(WEDNESDAY, 0, 0),
    slotMinutes: 30,
    ...overrides,
  };
}

describe('deriveSlots', () => {
  it('yields exactly 09:00 and 09:30 for a 09:00-10:00 window at 30 minutes', () => {
    const slots = deriveSlots(baseInput());

    expect(slots).toHaveLength(2);
    expect(slots[0].getHours()).toBe(9);
    expect(slots[0].getMinutes()).toBe(0);
    expect(slots[1].getHours()).toBe(9);
    expect(slots[1].getMinutes()).toBe(30);
  });

  it('never emits a slot that would run past the end of its window', () => {
    // 09:00-10:15 must not produce a 10:00 slot, which would end at 10:30.
    const slots = deriveSlots(
      baseInput({
        windows: [{ dayOfWeek: WEDNESDAY_DOW, startMinute: 9 * 60, endMinute: 10 * 60 + 15 }],
      }),
    );

    expect(slots).toHaveLength(2);
    expect(slots.some((s) => s.getHours() === 10)).toBe(false);
  });

  it('does not offer slots whose start time has already passed', () => {
    const slots = deriveSlots(baseInput({ now: at(WEDNESDAY, 9, 15) }));

    expect(slots).toHaveLength(1);
    expect(slots[0].getMinutes()).toBe(30);
  });

  it('withdraws a slot held by an active appointment', () => {
    const slots = deriveSlots(
      baseInput({ bookedStarts: new Set([at(WEDNESDAY, 9, 0).getTime()]) }),
    );

    expect(slots).toHaveLength(1);
    expect(slots[0].getMinutes()).toBe(30);
  });

  it('offers nothing on a date marked unavailable, despite a matching window', () => {
    const slots = deriveSlots(
      baseInput({ exceptionDates: new Set([dateKey(WEDNESDAY)]) }),
    );

    expect(slots).toEqual([]);
  });

  it('repeats a weekly window across every matching day in the range', () => {
    const slots = deriveSlots(
      baseInput({ to: new Date(WEDNESDAY.getTime() + 15 * 24 * 60 * 60 * 1000) }),
    );

    // Three Wednesdays fall in a fifteen day range, two slots each.
    expect(slots).toHaveLength(6);
  });

  it('ignores windows for other days of the week', () => {
    const slots = deriveSlots(
      baseInput({
        windows: [{ dayOfWeek: (WEDNESDAY_DOW + 1) % 7, startMinute: 9 * 60, endMinute: 10 * 60 }],
      }),
    );

    expect(slots).toEqual([]);
  });

  it('skips an inverted window rather than emitting garbage', () => {
    const slots = deriveSlots(
      baseInput({
        windows: [{ dayOfWeek: WEDNESDAY_DOW, startMinute: 10 * 60, endMinute: 9 * 60 }],
      }),
    );

    expect(slots).toEqual([]);
  });

  it('returns slots in chronological order across multiple windows', () => {
    const slots = deriveSlots(
      baseInput({
        windows: [
          { dayOfWeek: WEDNESDAY_DOW, startMinute: 14 * 60, endMinute: 15 * 60 },
          { dayOfWeek: WEDNESDAY_DOW, startMinute: 9 * 60, endMinute: 10 * 60 },
        ],
      }),
    );

    const times = slots.map((s) => s.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(slots[0].getHours()).toBe(9);
  });

  it('returns nothing when the doctor has no windows', () => {
    expect(deriveSlots(baseInput({ windows: [] }))).toEqual([]);
  });
});

describe('findWindowConflict', () => {
  const existing = [{ dayOfWeek: 2, startMinute: 9 * 60, endMinute: 12 * 60 }];

  it('detects an overlapping window on the same day', () => {
    expect(
      findWindowConflict({ dayOfWeek: 2, startMinute: 11 * 60, endMinute: 13 * 60 }, existing),
    ).not.toBeNull();
  });

  it('allows a window that starts exactly when another ends', () => {
    expect(
      findWindowConflict({ dayOfWeek: 2, startMinute: 12 * 60, endMinute: 14 * 60 }, existing),
    ).toBeNull();
  });

  it('allows the same hours on a different day', () => {
    expect(
      findWindowConflict({ dayOfWeek: 3, startMinute: 9 * 60, endMinute: 12 * 60 }, existing),
    ).toBeNull();
  });

  it('detects a window fully contained by another', () => {
    expect(
      findWindowConflict({ dayOfWeek: 2, startMinute: 10 * 60, endMinute: 11 * 60 }, existing),
    ).not.toBeNull();
  });
});
