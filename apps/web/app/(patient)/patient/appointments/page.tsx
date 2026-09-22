'use client';

import type { Appointment } from '@remedyo/shared';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Alert, ButtonLink, EmptyState, PageHeading, Spinner } from '@/components/ui';
import { AppointmentCard } from '@/features/appointments/appointment-card';
import { api } from '@/lib/api';

function AppointmentsView() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const justBooked = useSearchParams().get('booked');

  const load = useCallback(async () => {
    setAppointments(await api.get<Appointment[]>('/appointments'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (appointments === null) return <Spinner label="Loading appointments…" />;

  const now = Date.now();
  const upcoming = appointments.filter(
    (a) => a.state === 'SCHEDULED' && new Date(a.endsAt).getTime() >= now,
  );
  const past = appointments.filter(
    (a) => a.state !== 'SCHEDULED' || new Date(a.endsAt).getTime() < now,
  );

  return (
    <>
      <PageHeading
        title="My appointments"
        description="Everything booked, and everything that has already happened."
        action={<ButtonLink href="/patient/find-doctor">Book another</ButtonLink>}
      />

      {justBooked ? (
        <div className="mb-6">
          <Alert tone="success" title="Consultation booked">
            Your doctor has been notified. You can join from here when it is time.
          </Alert>
        </div>
      ) : null}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing booked"
            description="When you book a consultation it will appear here, with a link to join when it starts."
            action={<ButtonLink href="/patient/find-doctor">Find a doctor</ButtonLink>}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="PATIENT" onChanged={load} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
          Past ({past.length})
        </h2>
        {past.length === 0 ? (
          <EmptyState title="No past consultations yet" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {past.map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="PATIENT" onChanged={load} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function PatientAppointmentsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <AppointmentsView />
    </Suspense>
  );
}
