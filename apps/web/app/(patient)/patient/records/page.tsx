'use client';

import type { MedicalRecordEntry } from '@remedyo/shared';
import { useEffect, useState } from 'react';
import { Alert, ButtonLink, EmptyState, PageHeading, Spinner } from '@/components/ui';
import { RecordEntryCard } from '@/features/records/record-entry';
import { api } from '@/lib/api';

export default function PatientRecordsPage() {
  const [entries, setEntries] = useState<MedicalRecordEntry[] | null>(null);

  useEffect(() => {
    void api.get<MedicalRecordEntry[]>('/records/me').then(setEntries);
  }, []);

  if (entries === null) return <Spinner label="Loading your records…" />;

  const withContent = entries.filter(
    (e) => e.note || e.prescriptions.length > 0 || e.appointment.state === 'COMPLETED',
  );

  return (
    <>
      <PageHeading
        title="Medical records"
        description="Every consultation you have had, with the notes and prescriptions it produced."
      />

      <div className="mb-6">
        <Alert tone="warning" title="Fictional records">
          Everything on this page is demonstration data. No prescription here is
          valid for dispensing, and none of it is medical advice.
        </Alert>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="No consultations yet"
          description="Once you have seen a doctor, your consultation notes and prescriptions will be collected here."
          action={<ButtonLink href="/patient/find-doctor">Find a doctor</ButtonLink>}
        />
      ) : withContent.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="You have upcoming consultations, but none have been completed. Notes and prescriptions appear here afterwards."
          action={<ButtonLink href="/patient/appointments">See appointments</ButtonLink>}
        />
      ) : (
        <div className="space-y-5">
          {entries.map((e) => (
            <RecordEntryCard key={e.appointment.id} entry={e} />
          ))}
        </div>
      )}
    </>
  );
}
