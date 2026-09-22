'use client';

import { Suspense, useState } from 'react';
import type { SessionUser, Specialization } from '@remedyo/shared';
import { MIN_PASSWORD_LENGTH, SPECIALIZATIONS, SPECIALIZATION_LABELS } from '@remedyo/shared';
import { Alert, Field, Input, Textarea } from '@/components/ui';
import { AuthFooterLink, AuthFormShell } from '@/features/auth/auth-form';
import { api } from '@/lib/api';

function DoctorRegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState<Specialization[]>([]);

  function toggle(spec: Specialization) {
    setSpecializations((current) =>
      current.includes(spec) ? current.filter((s) => s !== spec) : [...current, spec],
    );
  }

  return (
    <AuthFormShell
      title="Join reMEDyo as a doctor"
      description="An administrator reviews every profile before it appears to patients."
      submitLabel="Submit for review"
      onSubmit={() =>
        api.post<SessionUser>('/auth/register/doctor', {
          email,
          password,
          fullName,
          licenseNumber,
          specializations,
          ...(yearsExperience ? { yearsExperience: Number(yearsExperience) } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        })
      }
      footer={
        <div className="space-y-1">
          <AuthFooterLink href="/login" prompt="Already registered?" label="Sign in" />
          <AuthFooterLink href="/register/patient" prompt="Looking for care?" label="Create a patient account" />
        </div>
      }
    >
      <Alert tone="info">
        Your profile stays unlisted and unbookable until an administrator
        approves it. You can sign in and finish your profile in the meantime.
      </Alert>

      <Field label="Full name" required>
        <Input
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Antonio Cruz"
        />
      </Field>

      <Field label="Email" required>
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@clinic.example"
        />
      </Field>

      <Field label="Password" required hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <Input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>

      <Field label="License number" required hint="Shown only to administrators during review.">
        <Input
          name="licenseNumber"
          required
          value={licenseNumber}
          onChange={(e) => setLicenseNumber(e.target.value)}
          placeholder="PRC-0000000"
        />
      </Field>

      <Field label="Years of experience">
        <Input
          type="number"
          min={0}
          max={70}
          name="yearsExperience"
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          placeholder="10"
        />
      </Field>

      <Field
        label="Specializations"
        required
        hint="Choose every area you consult in. Patients filter and match on these."
      >
        <div className="mt-1 grid max-h-52 gap-1.5 overflow-y-auto rounded-md border border-border-subtle p-3 sm:grid-cols-2">
          {SPECIALIZATIONS.map((spec) => (
            <label
              key={spec}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-text-primary hover:bg-surface-sunk"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border-strong text-brand-600 focus:ring-brand-600"
                checked={specializations.includes(spec)}
                onChange={() => toggle(spec)}
              />
              {SPECIALIZATION_LABELS[spec]}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Professional biography" hint="What you treat, and how you work. Patients read this first.">
        <Textarea
          name="bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Cardiologist working mainly with hypertension and arrhythmia…"
        />
      </Field>
    </AuthFormShell>
  );
}

export default function DoctorRegisterPage() {
  return (
    <Suspense fallback={null}>
      <DoctorRegisterForm />
    </Suspense>
  );
}
