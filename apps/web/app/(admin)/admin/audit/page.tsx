'use client';

import type { AuditAction, AuditEntry } from '@remedyo/shared';
import { AUDIT_ACTION_LABELS } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Card, EmptyState, PageHeading, Select, Spinner } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';

const ACTIONS = Object.keys(AUDIT_ACTION_LABELS) as AuditAction[];

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [actorId, setActorId] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (action) params.set('action', action);
    if (actorId) params.set('actorId', actorId);
    setEntries(await api.get<AuditEntry[]>(`/admin/audit?${params.toString()}`));
  }, [action, actorId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (entries === null) return <Spinner label="Loading the audit log…" />;

  // De-duplicated by actor id so the filter lists each administrator once.
  const actors = [...new Map(entries.map((e) => [e.actorId, e])).values()];

  return (
    <>
      <PageHeading
        title="Audit log"
        description="Every administrative action that changed something. Insert-only — entries cannot be edited or deleted."
      />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            value={action}
            onChange={(e) => setAction(e.target.value as AuditAction | '')}
            aria-label="Filter by action"
          >
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</option>
            ))}
          </Select>
          <Select
            value={actorId}
            onChange={(e) => setActorId(e.target.value)}
            aria-label="Filter by administrator"
          >
            <option value="">All administrators</option>
            {actors.map((a) => (
              <option key={a.actorId} value={a.actorId}>
                {a.actorEmail}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {entries.length === 0 ? (
        <EmptyState
          title="Nothing recorded yet"
          description="Suspensions, approvals and forced cancellations are written here as they happen. Simply viewing a page is not logged."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-left">
                <tr>
                  <Th>When</Th>
                  <Th>Administrator</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>Reason</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-600">
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-ink-800">{e.actorEmail}</td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          e.action.includes('APPROVED')
                            ? 'success'
                            : e.action.includes('REJECTED') || e.action.includes('SUSPENDED')
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {AUDIT_ACTION_LABELS[e.action]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      <span className="text-ink-500">{e.targetType}</span>{' '}
                      <code className="text-xs">{e.targetId.slice(-8)}</code>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-ink-600">{e.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-500">
      {children}
    </th>
  );
}
