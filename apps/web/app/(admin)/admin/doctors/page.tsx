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
  EmptyState,
  PageHeading,
  Spinner,
  Textarea,
} from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import { formatPeso } from '@/lib/format';

export default function DoctorReviewPage() {
  const [queue, setQueue] = useState<DoctorDetail[] | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [specs, setSpecs] = useState<Specialization[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setQueue(await api.get<DoctorDetail[]>('/admin/doctors/pending'));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>, message: string) {
    setError(null);
    try {
      await fn();
      setRejecting(null);
      setEditing(null);
      setReason('');
      setDone(message);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not complete that.');
    }
  }

  if (queue === null) return <Spinner label="Loading the review queue…" />;

  return (
    <>
      <PageHeading
        title="Doctor review"
        description="A doctor stays unlisted and unbookable until you approve them."
      />

      {error ? <div className="mb-5"><Alert tone="danger">{error}</Alert></div> : null}
      {done ? <div className="mb-5"><Alert tone="success">{done}</Alert></div> : null}

      {queue.length === 0 ? (
        <EmptyState
          title="Nothing waiting for review"
          description="Newly registered doctors appear here for approval before patients can find them."
        />
      ) : (
        <div className="space-y-5">
          {queue.map((d) => (
            <Card key={d.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Avatar initials={d.initials} size="lg" />
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Dr. {d.fullName}</h2>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {d.specializations.map((s) => (
                        <Badge key={s} tone="info">{SPECIALIZATION_LABELS[s]}</Badge>
                      ))}
                    </p>
                    <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
                      <div className="flex gap-1.5">
                        <dt className="text-text-muted">Licence</dt>
                        <dd className="font-medium text-text-primary">{d.licenseNumber || '—'}</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-text-muted">Experience</dt>
                        <dd className="font-medium text-text-primary">{d.yearsExperience} yrs</dd>
                      </div>
                      <div className="flex gap-1.5">
                        <dt className="text-text-muted">Fee</dt>
                        <dd className="font-medium text-text-primary">
                          {formatPeso(d.consultationFee)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <Badge tone="info">Pending</Badge>
              </div>

              <p className="mt-4 whitespace-pre-line rounded-md bg-surface-sunk p-4 text-sm leading-relaxed text-text-primary">
                {d.bio || 'No biography provided.'}
              </p>

              {rejecting === d.id ? (
                <div className="mt-4 space-y-3 rounded-md border border-danger-200 bg-danger-50 p-4">
                  <p className="text-sm font-medium text-text-primary">
                    Why is this profile being rejected? The doctor will see this.
                  </p>
                  <Textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Licence number could not be verified."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        void run(
                          () => api.post(`/admin/doctors/${d.id}/reject`, { reason }),
                          `Dr. ${d.fullName} was rejected and notified.`,
                        )
                      }
                    >
                      Confirm rejection
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejecting(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : editing === d.id ? (
                <div className="mt-4 space-y-3 rounded-md border border-border-subtle bg-surface-sunk p-4">
                  <p className="text-sm font-medium text-text-primary">Correct the specializations</p>
                  <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-md border border-border-subtle bg-surface p-3 sm:grid-cols-3">
                    {SPECIALIZATIONS.map((s) => (
                      <label key={s} className="flex items-center gap-2 text-sm text-text-primary">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border-strong text-brand-600"
                          checked={specs.includes(s)}
                          onChange={() =>
                            setSpecs((cur) =>
                              cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s],
                            )
                          }
                        />
                        {SPECIALIZATION_LABELS[s]}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        void run(
                          () =>
                            api.post(`/admin/doctors/${d.id}/specializations`, {
                              specializations: specs,
                            }),
                          'Specializations corrected.',
                        )
                      }
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                  <Button
                    size="sm"
                    onClick={() =>
                      void run(
                        () => api.post(`/admin/doctors/${d.id}/approve`),
                        `Dr. ${d.fullName} is now listed and bookable.`,
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => { setEditing(d.id); setSpecs(d.specializations); }}
                  >
                    Correct specializations
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setRejecting(d.id); setReason(''); }}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
