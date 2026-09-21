'use client';

import type { Slot } from '@remedyo/shared';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/ui';
import { formatDay, formatTime } from '@/lib/format';

/**
 * Slots grouped by day.
 *
 * The API returns a flat chronological list; grouping is a presentation
 * concern, so it happens here rather than shaping the endpoint around the UI.
 */
export function SlotPicker({
  slots,
  value,
  onChange,
}: {
  slots: Slot[];
  value: string | null;
  onChange: (startsAt: string) => void;
}) {
  const byDay = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = new Date(slot.startsAt).toDateString();
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    }
    return [...groups.entries()];
  }, [slots]);

  const [expanded, setExpanded] = useState(3);

  if (slots.length === 0) {
    return (
      <EmptyState
        title="No available slots"
        description="This doctor has no open consultation times in the next few weeks."
      />
    );
  }

  return (
    <div className="space-y-4">
      {byDay.slice(0, expanded).map(([day, daySlots]) => (
        <div key={day}>
          <p className="mb-2 text-sm font-medium text-ink-800">
            {formatDay(daySlots[0].startsAt)}
          </p>
          <div className="flex flex-wrap gap-2">
            {daySlots.map((slot) => {
              const active = value === slot.startsAt;
              return (
                <button
                  key={slot.startsAt}
                  type="button"
                  onClick={() => onChange(slot.startsAt)}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-200 bg-white text-ink-700 hover:border-brand-400 hover:text-brand-700'
                  }`}
                >
                  {formatTime(slot.startsAt)}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {byDay.length > expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((n) => n + 5)}
          className="text-sm font-medium text-brand-700 underline underline-offset-4"
        >
          Show more days ({byDay.length - expanded} more)
        </button>
      ) : null}
    </div>
  );
}
