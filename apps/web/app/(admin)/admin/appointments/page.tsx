'use client';

import type { Appointment, AppointmentState } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeading,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { AppointmentStateBadge } from '@/features/appointments/appointment-card';
import { api, ApiRequestError } from '@/lib/api';
import { formatRange } from '@/lib/format';

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [state, setState] = useState<AppointmentState | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (from) params.set('from', new Date(from).toISOString());
    if (to) params.set('to', new Date(`${to}T23:59:59`).toISOString());
    setAppointments(await api.get<Appointment[]>(`/admin/appointments?${params.toString()}`));
  }, [state, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string) {
    setError(null);
    try {
      await api.post(`/admin/appointments/${id}/cancel`, {
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setCancelling(null);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not cancel.');
    }
  }

  if (appointments === null) return <Spinner label="Loading appointments…" />;

  return (
    <>
      <PageHeading
        title="Appointment oversight"
        description="Every appointment in the system. Cancelling here releases the slot and notifies both parties."
      />

      {error ? <div className="mb-5"><Alert tone="danger">{error}</Alert></div> : null}

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
          <Select
            value={state}
            onChange={(e) => setState(e.target.value as AppointmentState | '')}
            aria-label="Filter by state"
            className="sm:w-44"
          >
            <option value="">All states</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            From
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            To
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </Card>

      {appointments.length === 0 ? (
        <EmptyState title="No appointments match" description="Try widening the filters." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-left">
                <tr>
                  <Th>Patient</Th>
                  <Th>Doctor</Th>
                  <Th>When</Th>
                  <Th>State</Th>
                  <Th>Session</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-ink-900">{a.patient.fullName}</td>
                    <td className="px-4 py-3 text-ink-700">Dr. {a.doctor.fullName}</td>
                    <td className="px-4 py-3 text-ink-600">
                      {formatRange(a.startsAt, a.endsAt)}
                    </td>
                    <td className="px-4 py-3"><AppointmentStateBadge appointment={a} /></td>
                    <td className="px-4 py-3"><Badge>{a.sessionState}</Badge></td>
                    <td className="px-4 py-3">
                      {a.state !== 'SCHEDULED' ? (
                        <span className="text-xs text-ink-400">—</span>
                      ) : cancelling === a.id ? (
                        <div className="w-56 space-y-2">
                          <Textarea
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (optional)"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" variant="danger" onClick={() => void cancel(a.id)}>
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setCancelling(null)}>
                              Back
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setCancelling(a.id); setReason(''); }}
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
      {children}
    </th>
  );
}
