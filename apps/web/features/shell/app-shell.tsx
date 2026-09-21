'use client';

import type { Role } from '@remedyo/shared';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar, Spinner } from '@/components/ui';
import { Logo } from '@/components/ui/logo';
import { NotificationBell } from '@/features/notifications/notification-bell';
import { useRequireRole, useSession } from '@/features/auth/session';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The shell every signed-in area shares.
 *
 * It enforces the expected role client-side purely so a patient never sees a
 * doctor's chrome flash before the API refuses the data. The API is what
 * actually protects anything.
 */
export function AppShell({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavItem[];
  children: ReactNode;
}) {
  const { ready } = useRequireRole(role);
  const { user, signOut } = useSession();
  const pathname = usePathname();

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Loading your account…" />
      </div>
    );
  }

  const roleLabel =
    role === 'PATIENT' ? 'Patient' : role === 'DOCTOR' ? 'Doctor' : 'Administrator';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href={nav[0]?.href ?? '/'} aria-label="reMEDyo home">
              <Logo />
            </Link>
            <span className="hidden rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-medium text-ink-600 sm:inline">
              {roleLabel}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2 border-l border-ink-200 pl-2">
              <Avatar initials={user.initials} size="sm" />
              <div className="hidden leading-tight sm:block">
                <p className="text-sm font-medium text-ink-900">
                  {user.displayName ?? user.email}
                </p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-xs text-ink-500 hover:text-brand-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>

        <nav className="mx-auto w-full max-w-7xl px-2 sm:px-4">
          <ul className="flex gap-1 overflow-x-auto">
            {nav.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== nav[0].href && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? 'border-brand-600 text-brand-700'
                        : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-ink-200 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-xs text-ink-500">
            <strong className="font-semibold text-alert-900">Fictional prototype.</strong>{' '}
            All doctors, records and prescriptions here are invented. Not for real
            medical use. <Link href="/privacy" className="underline">Privacy</Link> ·{' '}
            <Link href="/terms" className="underline">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
