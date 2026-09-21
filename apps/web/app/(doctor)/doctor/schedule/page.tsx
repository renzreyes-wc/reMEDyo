'use client';

import type { AvailabilityException, AvailabilityWindow, Slot } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeading,
  Select,
  Spinner,
} from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import { DAY_NAMES, formatDay, formatTime, minutesToClock } from '@/lib/format';

/** Half-hour options across the working day. */
const TIME_OPTIONS = Array.from({ length: 33 }, (_, i) => 6 * 60 + i * 30);

export default function DoctorSchedulePage() {
  const [windows, setWindows] = useState<AvailabilityWindow[] | null>(null);
  const [exceptions, setExceptions] = useState<AvailabilityException[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startMinute, setStartMinute] = useState('540');
  const [endMinute, setEndMinute] = useState('720');
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');

  const load = useCallback(async () => {
    const [w, e, s] = await Promise.all([
      api.get<AvailabilityWindow[]>('/availability/windows'),
      api.get<AvailabilityException[]>('/availability/exceptions'),
      api.get<Slot[]>('/availability/slots'),
    ]);
    setWindows(w);
    setExceptions(e);
    setSlots(s);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function addWindow(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api.post('/availability/windows', {
        dayOfWeek: Number(dayOfWeek),
        startMinute: Number(startMinute),
        endMinute: Number(endMinute),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not add that window.');
    }
  }

  async function removeWindow(id: string) {
    await api.delete(`/availability/windows/${id}`);
    await load();
  }

  async function addException(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!blockDate) return;
    try {
      await api.post('/availability/exceptions', {
        date: blockDate,
        ...(blockReason.trim() ? { reason: blockReason.trim() } : {}),
      });
      setBlockDate('');
      setBlockReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not block that date.');
    }
  }

  async function removeException(id: string) {
    await api.delete(`/availability/exceptions/${id}`);
    await load();
  }

  if (windows === null) return <Spinner label="Loading your schedule…" />;

  const byDay = DAY_NAMES.map((name, day) => ({
    name,
    day,
    windows: windows.filter((w) => w.dayOfWeek === day),
  }));

  return (
    <>
      <PageHeading
        title="My schedule"
        description="Recurring weekly hours, plus any single dates you are away. Bookable slots are derived from these."
      />

      {error ? <div className="mb-5"><Alert tone="danger">{error}</Alert></div> : null}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Weekly hours" description="Patients can book any half-hour inside these." />
            <div className="p-5">
              <form onSubmit={addWindow} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="Day">
                  <Select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)}>
                    {DAY_NAMES.map((name, i) => (
                      <option key={name} value={i}>{name}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="From">
                  <Select value={startMinute} onChange={(e) => setStartMinute(e.target.value)}>
                    {TIME_OPTIONS.map((m) => (
                      <option key={m} value={m}>{minutesToClock(m)}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="To">
                  <Select value={endMinute} onChange={(e) => setEndMinute(e.target.value)}>
                    {TIME_OPTIONS.map((m) => (
                      <option key={m} value={m}>{minutesToClock(m)}</option>
                    ))}
                  </Select>
                </Field>
                <div className="flex items-end">
                  <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                    Add
                  </Button>
                </div>
              </form>

              <div className="mt-6 space-y-3">
                {byDay.map(({ name, day, windows: dayWindows }) => (
                  <div key={day} className="flex items-start gap-4 border-b border-ink-100 pb-3 last:border-0">
                    <p className="w-24 shrink-0 text-sm font-medium text-ink-800">{name}</p>
                    {dayWindows.length === 0 ? (
                      <p className="text-sm text-ink-400">Not available</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {dayWindows.map((w) => (
                          <span
                            key={w.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-2.5 py-1 text-sm text-brand-800"
                          >
                            {minutesToClock(w.startMinute)} – {minutesToClock(w.endMinute)}
                            <button
                              type="button"
                              onClick={() => void removeWindow(w.id)}
                              className="text-brand-600 hover:text-danger-700"
                              aria-label="Remove window"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Days off" description="Blocks a single date, whatever your weekly hours say." />
            <div className="p-5">
              <form onSubmit={addException} className="grid gap-3 sm:grid-cols-[auto_1fr_auto]">
                <Field label="Date">
                  <Input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                  />
                </Field>
                <Field label="Reason (optional)">
                  <Input
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Conference"
                  />
                </Field>
                <div className="flex items-end">
                  <Button type="submit" variant="secondary">Block</Button>
                </div>
              </form>

              {exceptions.length === 0 ? (
                <p className="mt-4 text-sm text-ink-400">No blocked dates.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {exceptions.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2"
                    >
                      <span className="text-sm text-ink-800">
                        {formatDay(`${e.date}T00:00:00`)}
                        {e.reason ? <span className="text-ink-500"> — {e.reason}</span> : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeException(e.id)}
                        className="text-xs text-ink-400 hover:text-danger-700"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader
            title="What patients see"
            description={`${slots.length} bookable slots in the coming weeks.`}
          />
          <div className="max-h-[32rem] overflow-y-auto p-5">
            {slots.length === 0 ? (
              <EmptyState
                title="No bookable slots"
                description="Add weekly hours and slots will appear here immediately — they are derived, not generated."
              />
            ) : (
              <ul className="space-y-1.5">
                {slots.slice(0, 40).map((s) => (
                  <li key={s.startsAt} className="rounded-lg bg-ink-50 px-3 py-1.5 text-sm text-ink-700">
                    {formatDay(s.startsAt)} · {formatTime(s.startsAt)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
