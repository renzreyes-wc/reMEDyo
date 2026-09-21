'use client';

import { AppShell } from '@/features/shell/app-shell';

const NAV = [
  { href: '/patient', label: 'Overview' },
  { href: '/patient/find-doctor', label: 'Find a doctor' },
  { href: '/patient/appointments', label: 'Appointments' },
  { href: '/patient/records', label: 'Medical records' },
  { href: '/patient/profile', label: 'My profile' },
];

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell role="PATIENT" nav={NAV}>
      {children}
    </AppShell>
  );
}
