'use client';

import type { Appointment, MedicalRecordEntry, PatientProfile } from '@remedyo/shared';
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
import { useSession } from '@/features/auth/session';
import { api } from '@/lib/api';

export default function PatientDashboard() {
  const { user } = useSession();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [records, setRecords] = useState<MedicalRecordEntry[]>([]);
  const [profile, setProfile] = useState<PatientProfile | null>(null);

  async function load() {
    const [a, r, p] = await Promise.all([
      api.get<Appointment[]>('/appointments'),
      api.get<MedicalRecordEntry[]>('/records/me'),
      api.get<PatientProfile>('/patients/me/profile'),
    ]);
    setAppointments(a);
    setRecords(r);
    setProfile(p);
  }

  useEffect(() => {
    void load();
  }, []);

  if (appointments === null || !profile) return <Spinner label="Loading…" />;

  const now = Date.now();
  const upcoming = appointments
    .filter((a) => a.state === 'SCHEDULED' && new Date(a.endsAt).getTime() >= now)
    .slice(0, 2);
  const latestRecord = records.find((r) => r.note);
  const profileIncomplete = !profile.fullName || !profile.dateOfBirth;

  return (
    <>
      <PageHeading
        title={`Hello${user?.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}`}
        description="Your consultations and records at a glance."
        action={<ButtonLink href="/patient/find-doctor">Find a doctor</ButtonLink>}
      />

      {profileIncomplete ? (
        <div className="mb-6">
          <Alert tone="info" title="Finish your profile before booking">
            We need your name and date of birth so your doctor knows who they are
            seeing.{' '}
            <ButtonLink href="/patient/profile" size="sm" className="ml-1">
              Complete profile
            </ButtonLink>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Next consultations
          </h2>
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing booked"
              description="Describe what is bothering you and we will suggest the right kind of doctor."
              action={<ButtonLink href="/patient/find-doctor">Find a doctor</ButtonLink>}
            />
          ) : (
            <div className="space-y-4">
              {upcoming.map((a) => (
                <AppointmentCard key={a.id} appointment={a} viewer="PATIENT" onChanged={load} />
              ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Your health summary" />
            <dl className="space-y-3 p-5 text-sm">
              <Row label="Age" value={profile.age !== null ? `${profile.age} years` : 'Not set'} />
              <Row
                label="Weight"
                value={profile.weightKg ? `${profile.weightKg} kg` : 'Not recorded'}
              />
              <Row
                label="Height"
                value={profile.heightCm ? `${profile.heightCm} cm` : 'Not recorded'}
              />
              <Row
                label="Allergies"
                value={
                  profile.history.filter((h) => h.kind === 'ALLERGY').length > 0
                    ? profile.history
                        .filter((h) => h.kind === 'ALLERGY')
                        .map((h) => h.description)
                        .join(', ')
                    : 'None recorded'
                }
              />
            </dl>
          </Card>

          <Card>
            <CardHeader title="Latest record" />
            <div className="p-5">
              {latestRecord?.note ? (
                <>
                  <p className="text-sm font-medium text-text-primary">
                    Dr. {latestRecord.appointment.doctor.fullName}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-text-muted">
                    {latestRecord.note.diagnosis}
                  </p>
                  <ButtonLink href="/patient/records" variant="secondary" size="sm" className="mt-3">
                    View all records
                  </ButtonLink>
                </>
              ) : (
                <p className="text-sm text-text-muted">
                  No consultation notes yet. They appear here after your first completed consultation.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right font-medium text-text-primary">{value}</dd>
    </div>
  );
}
