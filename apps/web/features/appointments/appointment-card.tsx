'use client';

import type { Appointment, Slot } from '@remedyo/shared';
import { SPECIALIZATION_LABELS } from '@remedyo/shared';
import { useState } from 'react';
import { Alert, Avatar, Badge, Button, ButtonLink, Card, Textarea } from '@/components/ui';
import { SlotPicker } from '@/features/appointments/slot-picker';
import { api, ApiRequestError } from '@/lib/api';
import { formatRange, relativeTime } from '@/lib/format';

export function AppointmentStateBadge({ appointment }: { appointment: Appointment }) {
  if (appointment.state === 'CANCELLED') return <Badge tone="danger">Cancelled</Badge>;
  if (appointment.state === 'COMPLETED') return <Badge tone="success">Completed</Badge>;
  if (appointment.missed) return <Badge tone="info">Missed</Badge>;
  if (appointment.sessionState === 'IN_PROGRESS') return <Badge tone="brand">In progress</Badge>;
  if (appointment.sessionState === 'JOINED') return <Badge tone="brand">Waiting</Badge>;
  return <Badge tone="info">Scheduled</Badge>;
}

/**
 * One appointment, from whichever side is looking at it.
 *
 * `viewer` decides whose name is shown and which actions appear — a patient
 * can reschedule, a doctor cannot, and only the doctor sees the record-writing
 * route. The API enforces all of that again regardless.
 */
export function AppointmentCard({
  appointment,
  viewer,
  onChanged,
}: {
  appointment: Appointment;
  viewer: 'PATIENT' | 'DOCTOR';
  onChanged: () => void;
}) {
  const [action, setAction] = useState<'none' | 'cancel' | 'reschedule'>('none');
  const [reason, setReason] = useState('');
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [newSlot, setNewSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const counterpart =
    viewer === 'PATIENT'
      ? { name: `Dr. ${appointment.doctor.fullName}`, initials: appointment.doctor.initials }
      : { name: appointment.patient.fullName, initials: appointment.patient.initials };

  const isActive = appointment.state === 'SCHEDULED';
  const startsSoon = new Date(appointment.startsAt).getTime() - Date.now() < 15 * 60_000;
  const canJoin = isActive && !appointment.missed && startsSoon;

  async function openReschedule() {
    setAction('reschedule');
    setError(null);
    setSlots(await api.get<Slot[]>(`/doctors/${appointment.doctor.id}/slots`));
  }

  async function run(fn: () => Promise<unknown>) {
    setPending(true);
    setError(null);
    try {
      await fn();
      setAction('none');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Avatar initials={counterpart.initials} />
          <div>
            <p className="font-medium text-text-primary">{counterpart.name}</p>
            {viewer === 'PATIENT' ? (
              <p className="mt-0.5 flex flex-wrap gap-1">
                {appointment.doctor.specializations.map((s) => (
                  <Badge key={s} tone="info">{SPECIALIZATION_LABELS[s]}</Badge>
                ))}
              </p>
            ) : null}
          </div>
        </div>
        <AppointmentStateBadge appointment={appointment} />
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-text-muted">When</dt>
          <dd className="text-text-primary">
            {formatRange(appointment.startsAt, appointment.endsAt)}
            {isActive ? (
              <span className="ml-2 text-text-muted">({relativeTime(appointment.startsAt)})</span>
            ) : null}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-text-muted">Reason</dt>
          <dd className="text-text-primary">{appointment.reasonForVisit}</dd>
        </div>
        {appointment.cancellationReason ? (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-text-muted">Cancelled</dt>
            <dd className="text-text-primary">
              by {appointment.cancelledBy?.toLowerCase()} — {appointment.cancellationReason}
            </dd>
          </div>
        ) : null}
      </dl>

      {error ? <div className="mt-3"><Alert tone="danger">{error}</Alert></div> : null}

      {action === 'cancel' ? (
        <div className="mt-4 space-y-3 rounded-md border border-border-subtle bg-surface-sunk p-4">
          <p className="text-sm font-medium text-text-primary">Cancel this consultation?</p>
          <Textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() =>
                void run(() =>
                  api.post(`/appointments/${appointment.id}/cancel`, {
                    ...(reason.trim() ? { reason: reason.trim() } : {}),
                  }),
                )
              }
            >
              {pending ? 'Cancelling…' : 'Yes, cancel'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAction('none')}>
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      {action === 'reschedule' ? (
        <div className="mt-4 space-y-3 rounded-md border border-border-subtle bg-surface-sunk p-4">
          <p className="text-sm font-medium text-text-primary">Choose a new time</p>
          {slots === null ? (
            <p className="text-sm text-text-muted">Loading available times…</p>
          ) : (
            <SlotPicker slots={slots} value={newSlot} onChange={setNewSlot} />
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || !newSlot}
              onClick={() =>
                void run(() =>
                  api.post(`/appointments/${appointment.id}/reschedule`, {
                    startsAt: newSlot,
                  }),
                )
              }
            >
              {pending ? 'Moving…' : 'Confirm new time'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAction('none')}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {action === 'none' ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
          {canJoin ? (
            <ButtonLink href={`/consultation/${appointment.id}`} size="sm">
              Join consultation
            </ButtonLink>
          ) : null}

          {appointment.state === 'COMPLETED' ? (
            <ButtonLink
              href={
                viewer === 'PATIENT'
                  ? '/patient/records'
                  : `/doctor/consultations/${appointment.id}`
              }
              size="sm"
              variant="secondary"
            >
              {viewer === 'PATIENT'
                ? 'View record'
                : appointment.hasNote
                  ? 'Edit record'
                  : 'Write record'}
            </ButtonLink>
          ) : null}

          {isActive && viewer === 'PATIENT' ? (
            <Button variant="secondary" size="sm" onClick={() => void openReschedule()}>
              Reschedule
            </Button>
          ) : null}

          {isActive ? (
            <Button variant="ghost" size="sm" onClick={() => setAction('cancel')}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
