'use client';

import type { ConsultationContext } from '@remedyo/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Spinner,
} from '@/components/ui';
import { Logo } from '@/components/ui/logo';
import { useSession } from '@/features/auth/session';
import { api, ApiRequestError } from '@/lib/api';
import { formatRange, formatTime } from '@/lib/format';

/**
 * Polling interval for session state and new messages.
 *
 * design.md chooses polling over WebSockets deliberately: at this scale the
 * difference is invisible to the user, and the failure mode of a poll is a
 * slightly stale panel rather than a dead screen in the middle of a demo.
 */
const POLL_MS = 3000;

export default function ConsultationPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();

  const [context, setContext] = useState<ConsultationContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setContext(await api.get<ConsultationContext>(`/consultations/${id}`));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load.');
    }
  }, [id]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [context?.messages.length]);

  async function join() {
    setNotice(null);
    try {
      setContext(await api.post<ConsultationContext>(`/consultations/${id}/join`));
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Could not join.');
    }
  }

  async function complete() {
    setNotice(null);
    try {
      await api.post(`/consultations/${id}/complete`);
      router.push(`/doctor/consultations/${id}`);
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Could not end the session.');
    }
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    setNotice(null);
    try {
      await api.post(`/consultations/${id}/messages`, { body: draft.trim() });
      setDraft('');
      await load();
    } catch (err) {
      setNotice(err instanceof ApiRequestError ? err.message : 'Could not send.');
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <Centered>
        <EmptyState
          title="Consultation not available"
          description={error}
          action={<ButtonLink href="/">Back to reMEDyo</ButtonLink>}
        />
      </Centered>
    );
  }

  if (!context || !user) {
    return <Centered><Spinner label="Opening the consultation room…" /></Centered>;
  }

  const { appointment, sessionState, clinicalContext } = context;
  const isDoctor = user.role === 'DOCTOR';
  const counterpart = isDoctor
    ? { name: appointment.patient.fullName, initials: appointment.patient.initials }
    : { name: `Dr. ${appointment.doctor.fullName}`, initials: appointment.doctor.initials };

  // Gate on the session state as well as on "have I joined": the API refuses
  // a message while the session is still SCHEDULED, so the composer must not
  // appear in a state the server would reject.
  const sessionStarted = sessionState !== 'SCHEDULED';
  const selfJoined =
    sessionStarted && (isDoctor ? context.doctorJoinedAt : context.patientJoinedAt);
  const otherJoined = isDoctor ? context.patientJoinedAt : context.doctorJoinedAt;
  const ended = sessionState === 'COMPLETED' || appointment.state !== 'SCHEDULED';

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="border-b border-border-subtle bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={isDoctor ? '/doctor' : '/patient'} aria-label="Back">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <SessionBadge state={sessionState} missed={appointment.missed} />
            <ButtonLink
              href={isDoctor ? '/doctor/appointments' : '/patient/appointments'}
              variant="ghost"
              size="sm"
            >
              Leave
            </ButtonLink>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          {/* Conversation */}
          <Card className="flex min-h-[32rem] flex-col">
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <Avatar initials={counterpart.initials} size="sm" />
                  {counterpart.name}
                </span>
              }
              description={
                otherJoined
                  ? `Joined at ${formatTime(otherJoined)}`
                  : ended
                    ? 'Consultation ended'
                    : 'Not here yet'
              }
            />

            {notice ? (
              <div className="px-5 pt-4"><Alert tone="info">{notice}</Alert></div>
            ) : null}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {context.messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  {selfJoined
                    ? 'No messages yet. Say hello.'
                    : 'Join the consultation to start talking.'}
                </p>
              ) : (
                context.messages.map((m) => {
                  const mine = m.senderId === user.id;
                  return (
                    <div key={m.id} className={mine ? 'flex justify-end' : 'flex'}>
                      <div
                        className={`max-w-[80%] rounded-card px-4 py-2.5 ${
                          mine
                            ? 'bg-brand-600 text-white'
                            : 'bg-surface-sunk text-text-primary'
                        }`}
                      >
                        {!mine ? (
                          <p className="mb-0.5 text-xs font-medium opacity-70">
                            {m.senderName}
                          </p>
                        ) : null}
                        <p className="text-sm leading-relaxed">{m.body}</p>
                        <p className={`mt-1 text-[11px] ${mine ? 'text-brand-50' : 'text-text-muted'}`}>
                          {formatTime(m.sentAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border-subtle p-4">
              {ended ? (
                <p className="text-center text-sm text-text-muted">
                  This consultation has ended. The transcript above stays available to both of you.
                </p>
              ) : !selfJoined ? (
                <Button className="w-full" size="lg" onClick={() => void join()}>
                  Join the consultation
                </Button>
              ) : (
                <form onSubmit={send} className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type a message…"
                    aria-label="Message"
                  />
                  <Button type="submit" disabled={sending || !draft.trim()}>
                    Send
                  </Button>
                </form>
              )}
            </div>
          </Card>

          {/* Context panel */}
          <div className="space-y-5">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-text-primary">Appointment</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-text-muted">When</dt>
                  <dd className="text-text-primary">
                    {formatRange(appointment.startsAt, appointment.endsAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Reason for visit</dt>
                  <dd className="text-text-primary">{appointment.reasonForVisit}</dd>
                </div>
              </dl>
            </Card>

            {/* Clinical context is served to the doctor only. */}
            {clinicalContext ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-text-primary">Patient context</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-text-muted">Age</dt>
                    <dd className="text-text-primary">
                      {clinicalContext.age !== null ? `${clinicalContext.age} years` : 'Not recorded'}
                    </dd>
                  </div>
                  <ContextList label="Allergies" items={clinicalContext.allergies} tone="danger" />
                  <ContextList label="Current medication" items={clinicalContext.medications} />
                  <ContextList label="Conditions" items={clinicalContext.conditions} />
                </dl>
              </Card>
            ) : null}

            {isDoctor && !ended ? (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-text-primary">Finish up</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Ending the session marks the appointment completed and opens the
                  record form.
                </p>
                <Button
                  className="mt-3 w-full"
                  onClick={() => void complete()}
                  disabled={sessionState === 'SCHEDULED'}
                >
                  End consultation
                </Button>
              </Card>
            ) : null}

            {isDoctor && ended ? (
              <ButtonLink href={`/doctor/consultations/${id}`} className="w-full">
                {appointment.hasNote ? 'Edit the record' : 'Write the record'}
              </ButtonLink>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}

function ContextList({
  label,
  items,
  tone = 'neutral',
}: {
  label: string;
  items: string[];
  tone?: 'neutral' | 'danger';
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="mt-1">
        {items.length === 0 ? (
          <span className="text-text-muted">None recorded</span>
        ) : (
          <ul className="space-y-1">
            {items.map((item) => (
              <li
                key={item}
                className={`rounded px-2 py-1 text-sm ${
                  tone === 'danger'
                    ? 'bg-danger-50 text-danger-700'
                    : 'bg-surface-sunk text-text-primary'
                }`}
              >
                {item}
              </li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function SessionBadge({ state, missed }: { state: string; missed: boolean }) {
  if (state === 'COMPLETED') return <Badge tone="success">Completed</Badge>;
  if (state === 'IN_PROGRESS') return <Badge tone="brand">Both present</Badge>;
  if (state === 'JOINED') return <Badge tone="info">Waiting for the other person</Badge>;
  if (missed) return <Badge tone="danger">Missed</Badge>;
  return <Badge tone="info">Not started</Badge>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
