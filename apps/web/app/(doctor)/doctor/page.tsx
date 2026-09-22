'use client';

import type { Appointment, DoctorDetail } from '@remedyo/shared';
import { useEffect, useState } from 'react';
import {
  Alert,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeading,
  Spinner,
} from '@/components/ui';
import { AppointmentCard } from '@/features/appointments/appointment-card';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [profile, setProfile] = useState<DoctorDetail | null>(null);

  async function load() {
    const [a, p] = await Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<DoctorDetail>('/doctors/me'),
    ]);
    setAppointments(a);
    setProfile(p);
  }

  useEffect(() => {
    void load();
  }, []);

  if (appointments === null || !profile) return <Spinner label="Loading…" />;

  const now = Date.now();
  const today = appointments.filter(
    (a) =>
      a.state === 'SCHEDULED' &&
      new Date(a.startsAt).toDateString() === new Date().toDateString(),
  );
  const next = appointments
    .filter((a) => a.state === 'SCHEDULED' && new Date(a.endsAt).getTime() >= now)
    .slice(0, 3);
  const awaitingRecord = appointments.filter((a) => a.state === 'COMPLETED' && !a.hasNote);

  return (
    <>
      <PageHeading
        title={`Dr. ${profile.fullName}`}
        description="Your day, and anything waiting on you."
        action={<ButtonLink href="/doctor/schedule" variant="secondary">Manage schedule</ButtonLink>}
      />

      {profile.approvalState !== 'APPROVED' ? (
        <div className="mb-6">
          <Alert
            tone={profile.approvalState === 'PENDING' ? 'info' : 'danger'}
            title={
              profile.approvalState === 'PENDING'
                ? 'Your profile is awaiting review'
                : 'Your profile was not approved'
            }
          >
            {profile.approvalState === 'PENDING'
              ? 'Until an administrator approves it you do not appear in the directory and cannot receive bookings.'
              : (profile.rejectionReason ?? 'No reason was recorded.')}
            <div className="mt-2">
              <ButtonLink href="/doctor/profile" size="sm" variant="secondary">
                Review my profile
              </ButtonLink>
            </div>
          </Alert>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Today" value={today.length} hint="consultations" />
        <Stat label="Upcoming" value={next.length} hint="scheduled" />
        <Stat
          label="Awaiting a record"
          value={awaitingRecord.length}
          hint="completed, unwritten"
          tone={awaitingRecord.length > 0 ? 'attention' : 'neutral'}
        />
      </div>

      {awaitingRecord.length > 0 ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-support-700">
            Needs a written record
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {awaitingRecord.slice(0, 2).map((a) => (
              <AppointmentCard key={a.id} appointment={a} viewer="DOCTOR" onChanged={load} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Next up
          </h2>
          {next.length === 0 ? (
            <EmptyState
              title="No upcoming consultations"
              description="Patients book into the hours you publish on your schedule."
              action={<ButtonLink href="/doctor/schedule">Set your hours</ButtonLink>}
            />
          ) : (
            <div className="space-y-4">
              {next.map((a) => (
                <AppointmentCard key={a.id} appointment={a} viewer="DOCTOR" onChanged={load} />
              ))}
            </div>
          )}
        </section>

        <Card className="h-fit">
          <CardHeader title="Your availability" />
          <div className="p-5">
            <p className="text-sm text-text-muted">
              {profile.nextSlots.length} bookable slots in the coming weeks.
            </p>
            {profile.nextSlots.length > 0 ? (
              <p className="mt-2 text-sm text-text-muted">
                Next open slot: {formatDate(profile.nextSlots[0].startsAt)}
              </p>
            ) : null}
            <ButtonLink href="/doctor/schedule" variant="secondary" size="sm" className="mt-3">
              Manage schedule
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  hint: string;
  /** `attention` draws the eye without borrowing the safety hue. */
  tone?: 'neutral' | 'attention';
}) {
  return (
    <Card className={`p-5 ${tone === 'attention' ? 'border-support-300 bg-support-100' : ''}`}>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{hint}</p>
    </Card>
  );
}
