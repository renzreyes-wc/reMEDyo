'use client';

import type { MedicalRecordEntry } from '@remedyo/shared';
import { Alert, Badge, Card } from '@/components/ui';
import { formatDate, formatRange } from '@/lib/format';
import { AppointmentStateBadge } from '@/features/appointments/appointment-card';

/** A prescription always carries its non-dispensable label. Never optional. */
export function PrescriptionCard({
  prescription,
}: {
  prescription: MedicalRecordEntry['prescriptions'][number];
}) {
  return (
    <div className="rounded-md border border-alert-200 bg-alert-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-text-primary">{prescription.medication}</p>
          <p className="mt-0.5 text-sm text-text-primary">
            {prescription.dosage} · {prescription.frequency} · {prescription.durationDays} days
          </p>
        </div>
        <Badge tone="warning">Not dispensable</Badge>
      </div>

      {prescription.instructions ? (
        <p className="mt-2 text-sm text-text-muted">{prescription.instructions}</p>
      ) : null}

      <p className="mt-3 border-t border-alert-200 pt-2 text-xs text-alert-900">
        Prescribed by {prescription.prescriberName} on {formatDate(prescription.issuedAt)}.
        This is a fictional prototype prescription and is <strong>not valid</strong> for
        dispensing at any pharmacy.
      </p>
    </div>
  );
}

/**
 * The generated plain-language rendering of a note.
 *
 * Rendered beside the clinical note and never instead of it: the doctor's own
 * words stay on the page directly below, so a patient can always compare the
 * summary to its source. Labelled as generated, and stated not to be the
 * record — the note is.
 *
 * Uses the support hue. Not alert, which in this product means safety or
 * prototype status and belongs to the prescription warning alone.
 */
function PlainLanguageSummary({
  summary,
}: {
  summary: NonNullable<MedicalRecordEntry['summary']>;
}) {
  return (
    <div className="rounded-md border border-support-300 bg-support-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-support-700">
          Plain-language summary
        </p>
        <Badge tone="info">Generated</Badge>
      </div>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-primary">
        {summary.summary}
      </p>

      <p className="mt-3 border-t border-support-300 pt-2 text-xs text-support-700">
        Written by a computer to explain your doctor&rsquo;s note in everyday
        words. It is <strong>not</strong> your medical record and may be
        incomplete &mdash; your doctor&rsquo;s own note is below.
      </p>
    </div>
  );
}

export function RecordEntryCard({ entry }: { entry: MedicalRecordEntry }) {
  const { appointment, note, prescriptions, summary } = entry;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <p className="font-semibold text-text-primary">Dr. {appointment.doctor.fullName}</p>
          <p className="mt-0.5 text-sm text-text-muted">
            {formatRange(appointment.startsAt, appointment.endsAt)}
          </p>
        </div>
        <AppointmentStateBadge appointment={appointment} />
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            Reason for visit
          </p>
          <p className="mt-1 text-sm text-text-primary">{appointment.reasonForVisit}</p>
        </div>

        {note && summary ? <PlainLanguageSummary summary={summary} /> : null}

        {note ? (
          <>
            <Section label="Findings" value={note.findings} />
            <Section label="Diagnosis" value={note.diagnosis} />
            <Section label="Recommendations" value={note.recommendations} />
            {note.followUp ? <Section label="Follow-up" value={note.followUp} /> : null}
            <p className="text-xs text-text-muted">
              Recorded by {note.authorName} on {formatDate(note.createdAt)}
              {note.updatedAt !== note.createdAt
                ? ` · revised ${formatDate(note.updatedAt)}`
                : ''}
            </p>
          </>
        ) : appointment.state === 'COMPLETED' ? (
          <Alert tone="info">
            Your doctor has not written up this consultation yet. You will be
            notified when they do.
          </Alert>
        ) : null}

        {prescriptions.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Prescriptions ({prescriptions.length})
            </p>
            <div className="space-y-3">
              {prescriptions.map((p) => (
                <PrescriptionCard key={p.id} prescription={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-text-primary">{value}</p>
    </div>
  );
}
