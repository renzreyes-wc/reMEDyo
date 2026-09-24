'use client';

import type {
  AssistAvailability,
  DraftRefusalReason,
  ExtractionCandidate,
  MedicalRecordEntry,
  NoteDraft,
  NoteDraftResult,
} from '@remedyo/shared';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Badge,
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
/**
 * One absent-assistance state per cause. `unavailable` deliberately covers
 * disabled, unreachable, timed out and unparseable alike: the doctor's next
 * action is the same in every case, which is to write the note by hand.
 */
const REFUSAL_MESSAGES: Record<DraftRefusalReason, string> = {
  'transcript-empty':
    'There are no messages in this consultation, so there is nothing to summarise. Write the note by hand.',
  'transcript-too-thin':
    'This consultation is too short to summarise reliably. Write the note by hand rather than starting from a guess.',
  unavailable:
    'Drafting is unavailable right now. Write the note by hand; nothing else is affected.',
};

export default function ConsultationRecordPage() {
  const { id } = useParams<{ id: string }>();

  const [entry, setEntry] = useState<MedicalRecordEntry | null>(null);
  const [noteErrors, setNoteErrors] = useState<string[]>([]);
  const [rxErrors, setRxErrors] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState(false);
  const [saving, setSaving] = useState(false);

  // Assist state. `assist` is null until the availability call answers, so the
  // action is never rendered on a guess.
  const [assist, setAssist] = useState<AssistAvailability | null>(null);
  const [draft, setDraft] = useState<NoteDraft | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [refusal, setRefusal] = useState<DraftRefusalReason | null>(null);
  /**
   * Whether this form was pre-filled from a generated draft.
   *
   * Only the form knows: a stored draft does not mean the doctor used it.
   * Declared to the API at save time as a provenance marker.
   */
  const [usedDraft, setUsedDraft] = useState(false);

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

  // Ask whether assistance is on offer before rendering anything that uses it.
  useEffect(() => {
    void api
      .get<AssistAvailability>('/records/assist')
      .then(setAssist)
      .catch(() => setAssist({ enabled: false, model: null }));
  }, []);

  // A draft already generated for this appointment survives a reload without
  // costing a second generation.
  useEffect(() => {
    if (!assist?.enabled) return;
    void api
      .get<NoteDraft | null>(`/records/appointments/${id}/draft`)
      .then((existing) => existing && setDraft(existing))
      .catch(() => undefined);
  }, [assist?.enabled, id]);

  async function generateDraft() {
    setDrafting(true);
    setRefusal(null);
    try {
      const result = await api.post<NoteDraftResult>(
        `/records/appointments/${id}/draft`,
        {},
      );
      if (result.status === 'refused') {
        setRefusal(result.reason);
        return;
      }
      applyDraft(result.draft);
    } catch {
      setRefusal('unavailable');
    } finally {
      setDrafting(false);
    }
  }

  /** Pre-fill the form from a draft. The doctor edits and signs; this saves nothing. */
  function applyDraft(generated: NoteDraft) {
    setDraft(generated);
    setNote({
      findings: generated.findings,
      diagnosis: generated.diagnosis,
      recommendations: generated.recommendations,
      followUp: generated.followUp ?? '',
    });
    setUsedDraft(true);
  }

  /** Pre-fill the prescription form from a verified extraction candidate. */
  function applyCandidate(candidate: ExtractionCandidate) {
    setRx({
      medication: candidate.medication,
      dosage: candidate.dosage,
      frequency: candidate.frequency,
      durationDays: String(candidate.durationDays),
      instructions: candidate.instructions ?? '',
    });
  }

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
        aiAssisted: usedDraft,
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

              {/*
                The draft action is rendered only where assistance is actually
                on offer: with generation disabled the surface is absent, not a
                button that always fails.
              */}
              {assist?.enabled ? (
                <div className="rounded-md border border-support-300 bg-support-100 px-3 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-support-700">
                        Draft from this consultation
                      </p>
                      <p className="mt-0.5 text-xs text-support-700">
                        Summarises the session transcript. You review and sign it.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void generateDraft()}
                      disabled={drafting}
                    >
                      {drafting ? 'Drafting…' : draft ? 'Draft again' : 'Draft'}
                    </Button>
                  </div>

                  {refusal ? (
                    <p className="mt-3 border-t border-support-300 pt-2 text-xs text-support-700">
                      {REFUSAL_MESSAGES[refusal]}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {usedDraft && draft ? (
                <Alert tone="warning">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="warning">Generated</Badge>
                    <span className="font-semibold">
                      These fields were drafted by {draft.model}.
                    </span>
                  </div>
                  <p className="mt-1">
                    Nothing is recorded until you save. Read every field and
                    correct it before signing &mdash; you are the author of this
                    note.
                  </p>
                </Alert>
              ) : null}

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
              {/*
                Extraction, not generation: these values were read out of the
                doctor's own messages and verified against them server-side.
                They pre-fill the form; nothing exists until it is submitted.
              */}
              {draft && draft.extractionCandidates.length > 0 ? (
                <div className="mb-5 space-y-3 border-b border-border-subtle pb-5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      Mentioned in this consultation
                    </p>
                    <Badge tone="warning">Extracted</Badge>
                  </div>
                  {draft.extractionCandidates.map((candidate) => (
                    <div
                      key={`${candidate.sourceMessageId}-${candidate.medication}`}
                      className="rounded-md border border-support-300 bg-support-100 p-3"
                    >
                      <p className="text-sm font-medium text-text-primary">
                        {candidate.medication}
                      </p>
                      <p className="mt-0.5 text-sm text-text-primary">
                        {candidate.dosage} &middot; {candidate.frequency} &middot;{' '}
                        {candidate.durationDays} days
                      </p>
                      <p className="mt-2 border-l-2 border-support-300 pl-2 text-xs italic text-support-700">
                        &ldquo;{candidate.excerpt}&rdquo;
                      </p>
                      <p className="mt-2 text-xs text-support-700">
                        From your own message in this consultation. Nothing is
                        prescribed until you confirm it below.
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="mt-2"
                        onClick={() => applyCandidate(candidate)}
                      >
                        Use these values
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

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
