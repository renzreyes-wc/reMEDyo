'use client';

import type { MedicalRecordEntry } from '@remedyo/shared';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeading,
  Spinner,
  Textarea,
} from '@/components/ui';
import { PrescriptionCard } from '@/features/records/record-entry';
import { api, ApiRequestError } from '@/lib/api';
import { formatRange } from '@/lib/format';

/**
 * The doctor's post-consultation form.
 *
 * Reachable only after the session is completed — the API refuses a note on a
 * scheduled appointment, so the page reflects that rather than working around it.
 */
export default function ConsultationRecordPage() {
  const { id } = useParams<{ id: string }>();

  const [entry, setEntry] = useState<MedicalRecordEntry | null>(null);
  const [noteErrors, setNoteErrors] = useState<string[]>([]);
  const [rxErrors, setRxErrors] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState(false);
  const [saving, setSaving] = useState(false);

  const [note, setNote] = useState({
    findings: '',
    diagnosis: '',
    recommendations: '',
    followUp: '',
  });

  const [rx, setRx] = useState({
    medication: '',
    dosage: '',
    frequency: '',
    durationDays: '',
    instructions: '',
  });

  const load = useCallback(async () => {
    const data = await api.get<MedicalRecordEntry>(`/records/appointments/${id}`);
    setEntry(data);
    if (data.note) {
      setNote({
        findings: data.note.findings,
        diagnosis: data.note.diagnosis,
        recommendations: data.note.recommendations,
        followUp: data.note.followUp ?? '',
      });
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveNote(event: React.FormEvent) {
    event.preventDefault();
    setNoteErrors([]);
    setSavedNote(false);
    setSaving(true);
    try {
      await api.put(`/records/appointments/${id}/note`, {
        findings: note.findings,
        diagnosis: note.diagnosis,
        recommendations: note.recommendations,
        ...(note.followUp.trim() ? { followUp: note.followUp.trim() } : {}),
      });
      await load();
      setSavedNote(true);
    } catch (error) {
      setNoteErrors(error instanceof ApiRequestError ? error.details : ['Could not save.']);
    } finally {
      setSaving(false);
    }
  }

  async function addPrescription(event: React.FormEvent) {
    event.preventDefault();
    setRxErrors([]);
    try {
      await api.post(`/records/appointments/${id}/prescriptions`, {
        medication: rx.medication,
        dosage: rx.dosage,
        frequency: rx.frequency,
        durationDays: Number(rx.durationDays),
        ...(rx.instructions.trim() ? { instructions: rx.instructions.trim() } : {}),
      });
      setRx({ medication: '', dosage: '', frequency: '', durationDays: '', instructions: '' });
      await load();
    } catch (error) {
      setRxErrors(error instanceof ApiRequestError ? error.details : ['Could not add.']);
    }
  }

  if (!entry) return <Spinner label="Loading the consultation…" />;

  const { appointment } = entry;
  const completed = appointment.state === 'COMPLETED';

  return (
    <>
      <PageHeading
        title={`Record for ${appointment.patient.fullName}`}
        description={formatRange(appointment.startsAt, appointment.endsAt)}
        action={
          <ButtonLink href="/doctor/appointments" variant="secondary" size="sm">
            Back to consultations
          </ButtonLink>
        }
      />

      {!completed ? (
        <Alert tone="info" title="This consultation is not finished">
          You can write the record once the session has been completed. Open the
          consultation room and end the session first.
          <div className="mt-3">
            <ButtonLink href={`/consultation/${id}`} size="sm">
              Open the consultation room
            </ButtonLink>
          </div>
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <CardHeader
              title="Consultation notes"
              description={entry.note ? 'Editing creates a revision — nothing is lost.' : undefined}
            />
            <form onSubmit={saveNote} className="space-y-4 p-5">
              {noteErrors.length > 0 ? (
                <Alert tone="danger">
                  <ul className="list-inside list-disc">
                    {noteErrors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </Alert>
              ) : null}
              {savedNote ? <Alert tone="success">Record saved. The patient has been notified.</Alert> : null}

              <div className="rounded-md bg-surface-sunk px-3 py-2 text-sm">
                <span className="text-text-muted">Reason for visit: </span>
                <span className="text-text-primary">{appointment.reasonForVisit}</span>
              </div>

              <Field label="Findings" required>
                <Textarea
                  rows={4}
                  value={note.findings}
                  onChange={(e) => setNote({ ...note, findings: e.target.value })}
                  placeholder="History, examination, and what the patient reported."
                />
              </Field>

              <Field label="Diagnosis or impression" required>
                <Textarea
                  rows={2}
                  value={note.diagnosis}
                  onChange={(e) => setNote({ ...note, diagnosis: e.target.value })}
                />
              </Field>

              <Field label="Recommendations" required>
                <Textarea
                  rows={4}
                  value={note.recommendations}
                  onChange={(e) => setNote({ ...note, recommendations: e.target.value })}
                />
              </Field>

              <Field label="Follow-up" hint="Optional.">
                <Input
                  value={note.followUp}
                  onChange={(e) => setNote({ ...note, followUp: e.target.value })}
                  placeholder="Review in three weeks with a reading log."
                />
              </Field>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : entry.note ? 'Save revision' : 'Save record'}
              </Button>
            </form>
          </Card>

          <Card className="h-fit">
            <CardHeader
              title="Prescriptions"
              description="Fictional and clearly labelled as not dispensable."
            />
            <div className="p-5">
              <form onSubmit={addPrescription} className="space-y-3">
                {rxErrors.length > 0 ? (
                  <Alert tone="danger">
                    <ul className="list-inside list-disc">
                      {rxErrors.map((e) => <li key={e}>{e}</li>)}
                    </ul>
                  </Alert>
                ) : null}

                <Field label="Medication" required>
                  <Input
                    value={rx.medication}
                    onChange={(e) => setRx({ ...rx, medication: e.target.value })}
                    placeholder="Losartan"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Dosage" required>
                    <Input
                      value={rx.dosage}
                      onChange={(e) => setRx({ ...rx, dosage: e.target.value })}
                      placeholder="100 mg"
                    />
                  </Field>
                  <Field label="Duration (days)" required>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={rx.durationDays}
                      onChange={(e) => setRx({ ...rx, durationDays: e.target.value })}
                      placeholder="30"
                    />
                  </Field>
                </div>
                <Field label="Frequency" required>
                  <Input
                    value={rx.frequency}
                    onChange={(e) => setRx({ ...rx, frequency: e.target.value })}
                    placeholder="Once daily, in the morning"
                  />
                </Field>
                <Field label="Instructions">
                  <Textarea
                    rows={2}
                    value={rx.instructions}
                    onChange={(e) => setRx({ ...rx, instructions: e.target.value })}
                    placeholder="Take with or without food."
                  />
                </Field>

                <Button type="submit" variant="secondary" className="w-full">
                  Add prescription
                </Button>
              </form>

              {entry.prescriptions.length > 0 ? (
                <div className="mt-5 space-y-3 border-t border-border-subtle pt-5">
                  {entry.prescriptions.map((p) => (
                    <PrescriptionCard key={p.id} prescription={p} />
                  ))}
                </div>
              ) : null}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
