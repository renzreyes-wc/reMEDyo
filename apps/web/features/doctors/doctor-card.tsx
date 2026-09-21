'use client';

import type { DoctorSummary } from '@remedyo/shared';
import { SPECIALIZATION_LABELS } from '@remedyo/shared';
import Link from 'next/link';
import { Avatar, Badge, ButtonLink, Card } from '@/components/ui';
import { formatPeso } from '@/lib/format';

export function DoctorCard({
  doctor,
  reason,
  href,
}: {
  doctor: DoctorSummary;
  reason?: string;
  href: string;
}) {
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar initials={doctor.initials} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={href} className="block">
            <h3 className="truncate text-base font-semibold text-ink-900 hover:text-brand-700">
              Dr. {doctor.fullName}
            </h3>
          </Link>
          <p className="mt-0.5 flex flex-wrap gap-1">
            {doctor.specializations.map((s) => (
              <Badge key={s} tone="brand">{SPECIALIZATION_LABELS[s]}</Badge>
            ))}
          </p>
        </div>
      </div>

      {reason ? (
        <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          {reason}
        </p>
      ) : null}

      <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-600">
        {doctor.bioExcerpt || 'No biography provided yet.'}
      </p>

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-ink-100 pt-3 text-center">
        <div>
          <dt className="text-xs text-ink-500">Experience</dt>
          <dd className="text-sm font-medium text-ink-900">{doctor.yearsExperience} yrs</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Fee</dt>
          <dd className="text-sm font-medium text-ink-900">
            {formatPeso(doctor.consultationFee)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-ink-500">Availability</dt>
          <dd className="text-sm font-medium">
            {doctor.hasUpcomingAvailability ? (
              <span className="text-brand-700">This week</span>
            ) : (
              <span className="text-ink-400">None soon</span>
            )}
          </dd>
        </div>
      </dl>

      <ButtonLink href={href} className="mt-4 w-full" size="sm">
        View profile &amp; book
      </ButtonLink>
    </Card>
  );
}
