'use client';

import { AppShell } from '@/features/shell/app-shell';

const NAV = [
  { href: '/doctor', label: 'Overview' },
  { href: '/doctor/appointments', label: 'Consultations' },
  { href: '/doctor/schedule', label: 'My schedule' },
  { href: '/doctor/profile', label: 'My profile' },
];

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="DOCTOR" nav={NAV}>
      {children}
    </AppShell>
  );
}
