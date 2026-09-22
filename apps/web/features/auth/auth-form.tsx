'use client';

import type { SessionUser } from '@remedyo/shared';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Alert, Button, Card } from '@/components/ui';
import { ApiRequestError } from '@/lib/api';
import { homeForRole, useSession } from './session';

/**
 * Shared shell for sign-in and both registration forms.
 *
 * Holds the submit lifecycle, surfaces API validation messages inline (the API
 * returns an array for field errors), and routes to the right dashboard once a
 * session exists.
 */
export function AuthFormShell({
  title,
  description,
  submitLabel,
  onSubmit,
  footer,
  children,
}: {
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: () => Promise<SessionUser>;
  footer: ReactNode;
  children: ReactNode;
}) {
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useSession();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors([]);
    setPending(true);

    try {
      const user = await onSubmit();
      await refresh();

      const next = params.get('next');
      // A patient who has not filled in name and date of birth cannot book,
      // so send them straight to the profile rather than a dashboard they
      // cannot act from.
      const destination =
        next && next.startsWith('/')
          ? next
          : user.role === 'PATIENT' && !user.profileComplete
            ? '/patient/profile'
            : homeForRole(user.role);

      router.push(destination);
      router.refresh();
    } catch (error) {
      setErrors(
        error instanceof ApiRequestError
          ? error.details
          : ['Something went wrong. Please try again.'],
      );
      setPending(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">{title}</h1>
      <p className="mt-1.5 text-sm text-text-muted">{description}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {errors.length > 0 ? (
          <Alert tone="danger" title={errors.length > 1 ? 'Please fix the following' : undefined}>
            {errors.length > 1 ? (
              <ul className="list-inside list-disc space-y-0.5">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : (
              errors[0]
            )}
          </Alert>
        ) : null}

        {children}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? 'Just a moment…' : submitLabel}
        </Button>
      </form>

      <div className="mt-6 border-t border-border-subtle pt-4 text-sm text-text-muted">
        {footer}
      </div>
    </Card>
  );
}

export function AuthFooterLink({ href, prompt, label }: { href: string; prompt: string; label: string }) {
  return (
    <p>
      {prompt}{' '}
      <Link href={href} className="font-medium text-brand-900 underline underline-offset-4">
        {label}
      </Link>
    </p>
  );
}
