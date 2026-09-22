'use client';

import type { MedicalHistoryKind, PatientProfile } from '@remedyo/shared';
import { MEDICAL_HISTORY_LABELS } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  PageHeading,
  Select,
  Spinner,
} from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import { useSession } from '@/features/auth/session';

const KINDS: MedicalHistoryKind[] = ['ALLERGY', 'MEDICATION', 'CONDITION', 'NOTE'];

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const { refresh } = useSession();

  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '',
    contactNumber: '',
    weightKg: '',
    heightCm: '',
  });

  const [entryKind, setEntryKind] = useState<MedicalHistoryKind>('ALLERGY');
  const [entryText, setEntryText] = useState('');

  const load = useCallback(async () => {
    const data = await api.get<PatientProfile>('/patients/me/profile');
    setProfile(data);
    setForm({
      fullName: data.fullName ?? '',
      dateOfBirth: data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '',
      contactNumber: data.contactNumber ?? '',
      weightKg: data.weightKg?.toString() ?? '',
      heightCm: data.heightCm?.toString() ?? '',
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setErrors([]);
    setSaved(false);
    setSaving(true);
    try {
      await api.patch<PatientProfile>('/patients/me/profile', {
        fullName: form.fullName,
        ...(form.dateOfBirth ? { dateOfBirth: form.dateOfBirth } : {}),
        contactNumber: form.contactNumber,
        ...(form.weightKg ? { weightKg: Number(form.weightKg) } : {}),
        ...(form.heightCm ? { heightCm: Number(form.heightCm) } : {}),
      });
      await load();
      await refresh();
      setSaved(true);
    } catch (error) {
      setErrors(error instanceof ApiRequestError ? error.details : ['Could not save.']);
    } finally {
      setSaving(false);
    }
  }

  async function addEntry(event: React.FormEvent) {
    event.preventDefault();
    if (!entryText.trim()) return;
    await api.post('/patients/me/history', { kind: entryKind, description: entryText.trim() });
    setEntryText('');
    await load();
  }

  async function removeEntry(id: string) {
    await api.delete(`/patients/me/history/${id}`);
    await load();
  }

  if (!profile) return <Spinner label="Loading your profile…" />;

  const incomplete = !profile.fullName || !profile.dateOfBirth;

  return (
    <>
      <PageHeading
        title="My profile"
        description="What your doctor sees before a consultation starts."
      />

      {incomplete ? (
        <div className="mb-6">
          <Alert tone="info" title="Finish your profile to book">
            Your name and date of birth are required before you can book a
            consultation. Everything else is optional.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title="Personal details" />
          <form onSubmit={save} className="space-y-4 p-5">
            {errors.length > 0 ? (
              <Alert tone="danger">
                {errors.length > 1 ? (
                  <ul className="list-inside list-disc">
                    {errors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                ) : errors[0]}
              </Alert>
            ) : null}
            {saved ? <Alert tone="success">Profile saved.</Alert> : null}

            <div className="flex items-center gap-4">
              <Avatar initials={profile.initials} size="lg" />
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {profile.fullName ?? 'Unnamed patient'}
                </p>
                <p className="text-sm text-text-muted">
                  {profile.age !== null ? `${profile.age} years old` : 'Add your date of birth'}
                </p>
              </div>
            </div>

            <Field label="Full name" required>
              <Input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Maria Santos"
              />
            </Field>

            <Field label="Date of birth" required hint="Used to show your age to the doctor.">
              <Input
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </Field>

            <Field label="Contact number">
              <Input
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                placeholder="+63 917 000 0000"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Weight (kg)">
                <Input
                  type="number"
                  step="0.1"
                  min={1}
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </Field>
              <Field label="Height (cm)">
                <Input
                  type="number"
                  step="1"
                  min={20}
                  value={form.heightCm}
                  onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                />
              </Field>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Medical history"
            description="Shared with a doctor only once you have an appointment with them."
          />
          <div className="p-5">
            <form onSubmit={addEntry} className="flex flex-col gap-2 sm:flex-row">
              <Select
                value={entryKind}
                onChange={(e) => setEntryKind(e.target.value as MedicalHistoryKind)}
                className="sm:w-44"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>{MEDICAL_HISTORY_LABELS[k]}</option>
                ))}
              </Select>
              <Input
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="Penicillin — rash"
                className="flex-1"
              />
              <Button type="submit" variant="secondary">Add</Button>
            </form>

            <div className="mt-5 space-y-5">
              {KINDS.map((kind) => {
                const entries = profile.history.filter((h) => h.kind === kind);
                return (
                  <div key={kind}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                      {MEDICAL_HISTORY_LABELS[kind]}
                    </p>
                    {entries.length === 0 ? (
                      <p className="mt-1 text-sm text-text-muted">None recorded</p>
                    ) : (
                      <ul className="mt-1.5 space-y-1.5">
                        {entries.map((e) => (
                          <li
                            key={e.id}
                            className="flex items-start justify-between gap-3 rounded-md bg-surface-sunk px-3 py-2"
                          >
                            <span className="text-sm text-text-primary">{e.description}</span>
                            <button
                              type="button"
                              onClick={() => void removeEntry(e.id)}
                              className="shrink-0 text-xs text-text-muted hover:text-danger-700"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>

            {profile.history.length === 0 ? (
              <div className="mt-5">
                <EmptyState
                  title="Nothing recorded yet"
                  description="Allergies and current medication are the most useful things to add — your doctor sees them the moment a consultation opens."
                />
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}
