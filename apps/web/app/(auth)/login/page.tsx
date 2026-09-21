'use client';

import { Suspense, useState } from 'react';
import type { SessionUser } from '@remedyo/shared';
import { Field, Input } from '@/components/ui';
import { AuthFooterLink, AuthFormShell } from '@/features/auth/auth-form';
import { api } from '@/lib/api';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthFormShell
      title="Sign in"
      description="Patients, doctors and administrators all sign in here."
      submitLabel="Sign in"
      onSubmit={() => api.post<SessionUser>('/auth/login', { email, password })}
      footer={
        <div className="space-y-1">
          <AuthFooterLink href="/register/patient" prompt="New here?" label="Create a patient account" />
          <AuthFooterLink href="/register/doctor" prompt="Are you a clinician?" label="Join as a doctor" />
        </div>
      }
    >
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

      <Field label="Password" required>
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </Field>
    </AuthFormShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
