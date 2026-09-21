'use client';

import type { DoctorSummary, MatchResult, Specialization, SymptomOption } from '@remedyo/shared';
import { SPECIALIZATIONS, SPECIALIZATION_LABELS } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  PageHeading,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { DoctorCard } from '@/features/doctors/doctor-card';
import { api, ApiRequestError } from '@/lib/api';

type Mode = 'browse' | 'guided';

export default function FindDoctorPage() {
  const [mode, setMode] = useState<Mode>('browse');

  return (
    <>
      <PageHeading
        title="Find a doctor"
        description="Browse the directory, or tell us what is wrong and we will suggest who fits."
      />

      <div className="mb-6 inline-flex rounded-lg border border-ink-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setMode('browse')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            mode === 'browse' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Browse all
        </button>
        <button
          type="button"
          onClick={() => setMode('guided')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium ${
            mode === 'guided' ? 'bg-brand-600 text-white' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          Help me choose
        </button>
      </div>

      {mode === 'browse' ? <BrowseDoctors /> : <GuidedMatch />}
    </>
  );
}

function BrowseDoctors() {
  const [doctors, setDoctors] = useState<DoctorSummary[] | null>(null);
  const [q, setQ] = useState('');
  const [specialization, setSpecialization] = useState<Specialization | ''>('');
  const [availableSoon, setAvailableSoon] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (specialization) params.set('specialization', specialization);
    if (availableSoon) params.set('availableSoon', 'true');
    setDoctors(await api.get<DoctorSummary[]>(`/doctors?${params.toString()}`));
  }, [q, specialization, availableSoon]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  const hasFilters = Boolean(q.trim() || specialization || availableSoon);

  return (
    <>
      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or specialization…"
            aria-label="Search doctors"
          />
          <Select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value as Specialization | '')}
            aria-label="Filter by specialization"
            className="sm:w-56"
          >
            <option value="">All specializations</option>
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>{SPECIALIZATION_LABELS[s]}</option>
            ))}
          </Select>
          <label className="flex items-center gap-2 whitespace-nowrap px-1 text-sm text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              checked={availableSoon}
              onChange={(e) => setAvailableSoon(e.target.checked)}
            />
            Available this week
          </label>
        </div>
      </Card>

      {doctors === null ? (
        <Spinner label="Loading doctors…" />
      ) : doctors.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No doctors match those filters' : 'No doctors are listed yet'}
          description={
            hasFilters
              ? 'Try removing a filter or searching for a different specialization.'
              : 'Doctors appear here once an administrator has approved their profile.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQ('');
                  setSpecialization('');
                  setAvailableSoon(false);
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500">
            {doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {doctors.map((d) => (
              <DoctorCard key={d.id} doctor={d} href={`/patient/find-doctor/${d.id}`} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function GuidedMatch() {
  const [symptoms, setSymptoms] = useState<SymptomOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [severity, setSeverity] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void api.get<SymptomOption[]>('/matching/symptoms').then(setSymptoms);
  }, []);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      setResult(
        await api.post<MatchResult>('/matching', {
          symptomIds: selected,
          ...(freeText.trim() ? { freeText: freeText.trim() } : {}),
          ...(severity ? { severity } : {}),
          ...(durationDays ? { durationDays: Number(durationDays) } : {}),
        }),
      );
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiRequestError ? err.message : 'Could not get suggestions.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
      <Card className="h-fit">
        <CardHeader title="What is bothering you?" description="Pick everything that applies." />
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-ink-200 p-3">
            {symptoms.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 text-sm text-ink-700 hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                  checked={selected.includes(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <span>{s.label}</span>
              </label>
            ))}
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-800">
              Anything else? (optional)
            </span>
            <Textarea
              rows={3}
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="In your own words…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-800">How long?</span>
              <Input
                type="number"
                min={0}
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="Days"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-800">How bad?</span>
              <Select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">Not sure</option>
                <option value="MILD">Mild</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
              </Select>
            </label>
          </div>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Finding doctors…' : 'Suggest doctors'}
          </Button>
        </form>
      </Card>

      <div>
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {result ? (
          <div className="space-y-4">
            {result.emergencyWarning ? (
              <Alert tone="danger" title="If this is an emergency, do not wait for a consultation">
                One of the symptoms you selected can be a sign of a medical
                emergency. If you are experiencing severe chest pain, difficulty
                breathing, a seizure, or loss of consciousness, contact your local
                emergency services now rather than booking online.
              </Alert>
            ) : null}

            {result.fallback && result.fallbackReason ? (
              <Alert tone="warning">{result.fallbackReason}</Alert>
            ) : null}

            <Alert tone="info">
              These suggestions come from stored matching rules, not a diagnosis.
              They point you at the right kind of specialist — the doctor decides
              what is actually going on.
            </Alert>

            {result.suggestions.length === 0 ? (
              <EmptyState
                title="No doctors available right now"
                description="No approved doctor currently covers this. Try browsing the full directory."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {result.suggestions.map((s) => (
                  <DoctorCard
                    key={s.doctor.id}
                    doctor={s.doctor}
                    reason={s.reason}
                    href={`/patient/find-doctor/${s.doctor.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            title="Tell us what is wrong"
            description="Select your symptoms on the left and we will suggest the kind of doctor that fits — and explain why."
          />
        )}
      </div>
    </div>
  );
}
