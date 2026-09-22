'use client';

import type { DoctorDetail, Specialization } from '@remedyo/shared';
import { SPECIALIZATIONS, SPECIALIZATION_LABELS } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  Input,
  PageHeading,
  Spinner,
  Textarea,
} from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorDetail | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    bio: '',
    yearsExperience: '',
    licenseNumber: '',
    consultationFee: '',
  });
  const [specializations, setSpecializations] = useState<Specialization[]>([]);

  const load = useCallback(async () => {
    const data = await api.get<DoctorDetail>('/doctors/me');
    setProfile(data);
    setForm({
      fullName: data.fullName,
      bio: data.bio,
      yearsExperience: String(data.yearsExperience),
      licenseNumber: data.licenseNumber,
      consultationFee: String(data.consultationFee),
    });
    setSpecializations(data.specializations);
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
      await api.patch('/doctors/me', {
        fullName: form.fullName,
        bio: form.bio,
        specializations,
        licenseNumber: form.licenseNumber,
        ...(form.yearsExperience ? { yearsExperience: Number(form.yearsExperience) } : {}),
        ...(form.consultationFee ? { consultationFee: Number(form.consultationFee) } : {}),
      });
      await load();
      setSaved(true);
    } catch (error) {
      setErrors(error instanceof ApiRequestError ? error.details : ['Could not save.']);
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <Spinner label="Loading your profile…" />;

  return (
    <>
      <PageHeading
        title="My profile"
        description="What patients see when they find you in the directory."
      />

      <div className="mb-6">
        {profile.approvalState === 'APPROVED' ? (
          <Alert tone="success" title="Your profile is live">
            You appear in the directory and patients can book you.
          </Alert>
        ) : profile.approvalState === 'PENDING' ? (
          <Alert tone="info" title="Awaiting review">
            An administrator is reviewing your profile. Until it is approved you
            do not appear in the directory and cannot receive bookings.
          </Alert>
        ) : (
          <Alert tone="danger" title="Your profile was not approved">
            {profile.rejectionReason ?? 'No reason was recorded.'} You can update
            your details below and an administrator will look again.
          </Alert>
        )}
      </div>

      <Card>
        <CardHeader
          title="Professional details"
          action={
            <span className="flex items-center gap-2">
              <Avatar initials={profile.initials} />
              <Badge tone={profile.approvalState === 'APPROVED' ? 'success' : 'info'}>
                {profile.approvalState}
              </Badge>
            </span>
          }
        />
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

          <Field label="Full name" required>
            <Input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>

          <Field
            label="Specializations"
            required
            hint="Patients filter and match on these, so keep them accurate."
          >
            <div className="mt-1 grid max-h-48 gap-1.5 overflow-y-auto rounded-md border border-border-subtle p-3 sm:grid-cols-3">
              {SPECIALIZATIONS.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-text-primary hover:bg-surface-sunk"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-600"
                    checked={specializations.includes(s)}
                    onChange={() =>
                      setSpecializations((cur) =>
                        cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                      )
                    }
                  />
                  {SPECIALIZATION_LABELS[s]}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Biography" hint="Patients read this first. What you treat, and how you work.">
            <Textarea
              rows={5}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Years of experience">
              <Input
                type="number"
                min={0}
                max={70}
                value={form.yearsExperience}
                onChange={(e) => setForm({ ...form, yearsExperience: e.target.value })}
              />
            </Field>
            <Field label="License number">
              <Input
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
              />
            </Field>
            <Field label="Consultation fee (PHP)">
              <Input
                type="number"
                min={0}
                value={form.consultationFee}
                onChange={(e) => setForm({ ...form, consultationFee: e.target.value })}
              />
            </Field>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>
    </>
  );
}
