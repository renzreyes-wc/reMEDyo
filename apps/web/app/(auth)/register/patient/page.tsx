'use client';

import { Suspense, useState } from 'react';
import type { SessionUser } from '@remedyo/shared';
import { MIN_PASSWORD_LENGTH } from '@remedyo/shared';
import { Field, Input } from '@/components/ui';
import { AuthFooterLink, AuthFormShell } from '@/features/auth/auth-form';
import { api } from '@/lib/api';

function PatientRegisterForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthFormShell
      title="Create your patient account"
      description="You will add your health details on the next screen — it takes about a minute."
      submitLabel="Create account"
      onSubmit={() =>
        api.post<SessionUser>('/auth/register/patient', {
          email,
          password,
          ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
        })
      }
      footer={
        <div className="space-y-1">
          <AuthFooterLink href="/login" prompt="Already have an account?" label="Sign in" />
          <AuthFooterLink href="/register/doctor" prompt="Are you a clinician?" label="Join as a doctor" />
        </div>
      }
    >
      <Field label="Full name" hint="As you would like your doctor to see it.">
        <Input
          name="fullName"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Maria Santos"
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
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Password"
        required
        hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
      >
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
    </AuthFormShell>
  );
}

export default function PatientRegisterPage() {
  return (
    <Suspense fallback={null}>
      <PatientRegisterForm />
    </Suspense>
  );
}
