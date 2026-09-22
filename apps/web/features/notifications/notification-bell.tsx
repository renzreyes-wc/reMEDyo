'use client';

import type { Notification } from '@remedyo/shared';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';
import { relativeTime } from '@/lib/format';

const POLL_MS = 15_000;

/**
 * Notifications and imminent-appointment reminders in one panel.
 *
 * Reminders are computed server-side on read rather than delivered, so they
 * arrive through the same poll as stored notifications and simply stop
 * appearing once an appointment is cancelled.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [list, count, due] = await Promise.all([
        api.get<Notification[]>('/notifications'),
        api.get<{ unread: number }>('/notifications/unread-count'),
        api.get<Notification[]>('/notifications/reminders'),
      ]);
      setItems(list);
      setUnread(count.unread);
      setReminders(due);
    } catch {
      // A failed poll is not worth interrupting the page for.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function markAll() {
    await api.post('/notifications/read-all');
    await load();
  }

  async function markOne(id: string) {
    await api.post(`/notifications/${id}/read`);
    await load();
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-sunk hover:text-text-primary"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2.5a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10.5v-3a5 5 0 0 0-5-5ZM8 16a2 2 0 0 0 4 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-card border border-border-subtle bg-surface shadow-floating">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <p className="text-sm font-semibold text-text-primary">Notifications</p>
            {unread > 0 ? (
              <Button variant="ghost" size="sm" onClick={markAll}>
                Mark all read
              </Button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {reminders.length > 0 ? (
              <div className="border-b border-border-subtle bg-brand-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-900">
                  Starting soon
                </p>
                {reminders.map((r) => (
                  <Link
                    key={r.id}
                    href={r.link ?? '#'}
                    onClick={() => setOpen(false)}
                    className="mt-2 block rounded-md bg-surface p-3 hover:bg-brand-50"
                  >
                    <p className="text-sm font-medium text-text-primary">{r.title}</p>
                    <p className="mt-0.5 text-sm text-text-muted">{r.body}</p>
                    <span className="mt-1 inline-block text-xs font-medium text-brand-900">
                      Join the consultation →
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}

            {items.length === 0 && reminders.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                Nothing yet. Bookings and record updates will appear here.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle">
                {items.map((n) => (
                  <li key={n.id} className={n.readAt ? '' : 'bg-brand-50'}>
                    <Link
                      href={n.link ?? '#'}
                      onClick={() => {
                        if (!n.readAt) void markOne(n.id);
                        setOpen(false);
                      }}
                      className="block px-4 py-3 hover:bg-surface-sunk"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">{n.title}</p>
                        {!n.readAt ? <Badge tone="brand">New</Badge> : null}
                      </div>
                      <p className="mt-0.5 text-sm text-text-muted">{n.body}</p>
                      <p className="mt-1 text-xs text-text-muted">{relativeTime(n.createdAt)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
