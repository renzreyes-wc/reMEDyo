'use client';

import type { Appointment } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import { EmptyState, PageHeading, Spinner } from '@/components/ui';
import { AppointmentCard } from '@/features/appointments/appointment-card';
import { api } from '@/lib/api';

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);

  const load = useCallback(async () => {
    setAppointments(await api.get<Appointment[]>('/appointments'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (appointments === null) return <Spinner label="Loading your consultations…" />;

  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => a.state === 'SCHEDULED' && new Date(a.endsAt).getTime() >= now,
  );
  const awaitingRecord = appointments.filter((a) => a.state === 'COMPLETED' && !a.hasNote);
  const done = appointments.filter(
    (a) => (a.state === 'COMPLETED' && a.hasNote) || a.state === 'CANCELLED' ||
      (a.state === 'SCHEDULED' && new Date(a.endsAt).getTime() < now),
  );

  return (
    <>
      <PageHeading
        title="Consultations"
        description="Your queue, ordered by start time."
      />

      {awaitingRecord.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-support-700">
            Needs a written record ({awaitingRecord.length})
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {awaitingRecord.map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="DOCTOR" onChanged={load} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming consultations"
            description="Patients book into the hours you set on your schedule page."
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="DOCTOR" onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Past ({done.length})
        </h2>
        {done.length === 0 ? (
          <EmptyState title="Nothing in the past yet" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {done.map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="DOCTOR" onChanged={load} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
