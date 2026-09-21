'use client';

import type { AdminUserRow, Role } from '@remedyo/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeading,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui';
import { api, ApiRequestError } from '@/lib/api';
import { formatDate } from '@/lib/format';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [acting, setActing] = useState<{ id: string; action: string } | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (role) params.set('role', role);
    setUsers(await api.get<AdminUserRow[]>(`/admin/users?${params.toString()}`));
  }, [q, role]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [load]);

  async function run(id: string, action: string, withReason: boolean) {
    setError(null);
    try {
      await api.post(`/admin/users/${id}/${action}`, withReason ? { reason } : {});
      setActing(null);
      setReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not complete that.');
    }
  }

  if (users === null) return <Spinner label="Loading accounts…" />;

  return (
    <>
      <PageHeading
        title="Accounts"
        description="Patients and doctors. Administrator accounts are provisioned, not managed here."
      />

      {error ? <div className="mb-5"><Alert tone="danger">{error}</Alert></div> : null}

      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search accounts"
          />
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as Role | '')}
            aria-label="Filter by role"
            className="sm:w-44"
          >
            <option value="">All roles</option>
            <option value="PATIENT">Patients</option>
            <option value="DOCTOR">Doctors</option>
          </Select>
        </div>
      </Card>

      {users.length === 0 ? (
        <EmptyState title="No accounts match" description="Try a different search." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50/60 text-left">
                <tr>
                  <Th>Account</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={u.initials} size="sm" tone="ink" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">
                            {u.fullName ?? '—'}
                          </p>
                          <p className="truncate text-xs text-ink-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{u.role}</Badge>
                      {u.approvalState ? (
                        <Badge
                          tone={u.approvalState === 'APPROVED' ? 'success' : 'warning'}
                          className="ml-1"
                        >
                          {u.approvalState}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          u.status === 'ACTIVE'
                            ? 'success'
                            : u.status === 'SUSPENDED'
                              ? 'warning'
                              : 'danger'
                        }
                      >
                        {u.status}
                      </Badge>
                      {u.statusReason ? (
                        <p className="mt-1 max-w-48 text-xs text-ink-500">{u.statusReason}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-ink-600">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      {acting?.id === u.id ? (
                        <div className="w-64 space-y-2">
                          <Textarea
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (required)"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void run(u.id, acting.action, true)}
                            >
                              Confirm
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setActing(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {u.status !== 'ACTIVE' ? (
                            <Button size="sm" variant="secondary" onClick={() => void run(u.id, 'activate', false)}>
                              Activate
                            </Button>
                          ) : null}
                          {u.status !== 'SUSPENDED' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setActing({ id: u.id, action: 'suspend' }); setReason(''); }}
                            >
                              Suspend
                            </Button>
                          ) : null}
                          {u.status !== 'DEACTIVATED' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setActing({ id: u.id, action: 'deactivate' }); setReason(''); }}
                            >
                              Deactivate
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </td>
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
