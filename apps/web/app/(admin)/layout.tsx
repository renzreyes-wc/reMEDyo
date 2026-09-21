'use client';

import { AppShell } from '@/features/shell/app-shell';

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/doctors', label: 'Doctor review' },
  { href: '/admin/users', label: 'Accounts' },
  { href: '/admin/appointments', label: 'Appointments' },
  { href: '/admin/audit', label: 'Audit log' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="ADMIN" nav={NAV}>
      {children}
    </AppShell>
  );
}
