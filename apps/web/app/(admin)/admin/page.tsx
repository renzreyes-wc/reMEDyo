'use client';

import type { AdminStats } from '@remedyo/shared';
import { useEffect, useState } from 'react';
import { ButtonLink, Card, CardHeader, PageHeading, Spinner } from '@/components/ui';
import { api } from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    void api.get<AdminStats>('/admin/stats').then(setStats);
  }, []);

  if (!stats) return <Spinner label="Loading dashboard…" />;

  return (
    <>
      <PageHeading
        title="Operations dashboard"
        description="Counts derived straight from the database — no analytics service involved."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Patients" value={stats.patients} />
        <Stat label="Doctors" value={stats.doctors} />
        <Stat
          label="Awaiting review"
          value={stats.doctorsPendingReview}
          tone={stats.doctorsPendingReview > 0 ? 'attention' : 'neutral'}
          action={
            stats.doctorsPendingReview > 0 ? (
              <ButtonLink href="/admin/doctors" size="sm" className="mt-3">
                Review now
              </ButtonLink>
            ) : undefined
          }
        />
        <Stat label="Consultations completed" value={stats.consultationsCompleted} />
      </div>

      <Card className="mt-6">
        <CardHeader title="Appointments by state" />
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          <Stat label="Scheduled" value={stats.appointmentsByState.SCHEDULED} flat />
          <Stat label="Completed" value={stats.appointmentsByState.COMPLETED} flat />
          <Stat label="Cancelled" value={stats.appointmentsByState.CANCELLED} flat />
        </div>
      </Card>
    </>
  );
}

function Stat({
  label,
  value,
  tone = 'neutral',
  flat = false,
  action,
}: {
  label: string;
  value: number;
  /** `attention` draws the eye without borrowing the safety hue. */
  tone?: 'neutral' | 'attention';
  flat?: boolean;
  action?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="text-sm text-text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-text-primary">{value}</p>
      {action}
    </>
  );

  if (flat) return <div className="rounded-md bg-surface-sunk p-4">{body}</div>;

  return (
    <Card className={`p-5 ${tone === 'attention' ? 'border-support-300 bg-support-100' : ''}`}>
      {body}
    </Card>
  );
}
