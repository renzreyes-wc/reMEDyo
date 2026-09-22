import Link from 'next/link';
import { Avatar, Badge, ButtonLink } from '@/components/ui';
import { PrototypeDisclaimer } from '@/components/ui/disclaimer';

const STEPS = [
  {
    n: '01',
    title: 'Tell us what is wrong',
    body: 'Pick your symptoms from a short list, or search directly by specialization. We suggest the kind of doctor that fits — and tell you why.',
  },
  {
    n: '02',
    title: 'Choose a time that works',
    body: 'See each doctor’s real availability and book a slot. Reschedule or cancel yourself, any time before the consultation starts.',
  },
  {
    n: '03',
    title: 'Meet in the consultation room',
    body: 'Both of you join the same workspace. Your history, allergies and current medication are already there, so the conversation starts at the point that matters.',
  },
  {
    n: '04',
    title: 'Keep the record',
    body: 'Notes and prescriptions land in your account the moment the doctor writes them. Nothing to chase, nothing to lose.',
  },
];

const CAPABILITIES = [
  {
    title: 'Guided doctor matching',
    body: 'Describe a concern and get a ranked shortlist with a plain-language reason for every suggestion. Rules you can read, not a black box.',
  },
  {
    title: 'Real availability, no double-booking',
    body: 'Slots come from each doctor’s own schedule. Two people cannot take the same one — the database settles that, not a hopeful check.',
  },
  {
    title: 'Your record, in one place',
    body: 'Every past consultation, note and prescription, readable by you and by the doctors you have actually seen. Nobody else.',
  },
  {
    title: 'A consultation room that knows the context',
    body: 'Age, allergies, current medication and the reason for the visit are on screen for the doctor before a word is typed.',
  },
  {
    title: 'You are told what changed',
    body: 'Bookings, reschedules, cancellations and new records all raise a notification in the app. No inbox, no SMS, nothing to opt into.',
  },
  {
    title: 'Oversight that leaves a trail',
    body: 'Administrators review doctor profiles before anyone can book them, and every administrative action is written to an audit log.',
  },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border-subtle">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_75%_-10%,var(--color-brand-50),transparent)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-300 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-900">
                Telehealth, end to end
              </span>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-text-primary sm:text-5xl">
                Talk to a doctor,
                <br />
                without the waiting room.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-muted">
                reMEDyo connects you to the right clinician for what you are
                actually worried about — then keeps the booking, the
                consultation and the record in one place.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/register/patient" size="lg">
                  Find a doctor
                </ButtonLink>
                <ButtonLink href="/register/doctor" variant="secondary" size="lg">
                  Join as a doctor
                </ButtonLink>
              </div>

              <p className="mt-4 text-sm text-text-muted">
                Already with us?{' '}
                <Link href="/login" className="font-medium text-brand-900 underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>

            {/* A live mock of real match output, drawn in markup rather
                than shipped as a screenshot from an image host.

                The label matters: the visitor is unauthenticated and matching
                is patient-only, so nothing "suggested for them" can exist.
                This is framed as what follows an intake, with the example
                symptom named, so it reads as an illustration rather than a
                personalised result. */}
            <div className="relative">
              {/* Decorative art, served from the application's own static
                  assets — never an image host. It carries no meaning, which
                  is why peach and lilac are allowed here and nowhere that a
                  reader could mistake them for a status. */}
              <img
                src="/hero-art.svg"
                alt=""
                aria-hidden="true"
                width={640}
                height={520}
                className="pointer-events-none absolute -left-16 -top-16 h-[130%] w-[130%] max-w-none select-none"
              />

              <div className="relative rounded-card border border-border-subtle bg-surface p-6 shadow-floating">
                <div className="flex items-center justify-between gap-3 border-b border-border-subtle pb-4">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      After a one-minute intake
                    </p>
                    <p className="mt-0.5 text-xs text-text-muted">
                      Example: someone reporting chest tightness
                    </p>
                  </div>
                  <Badge tone="brand">3 matches</Badge>
                </div>

                <ul className="divide-y divide-border-subtle">
                  {[
                    { initials: 'AC', name: 'Dr. Antonio Cruz', spec: 'Cardiology', why: 'Matches “chest tightness”', slot: 'Tomorrow, 9:00 AM' },
                    { initials: 'MS', name: 'Dr. Maria Santos', spec: 'General Practice', why: 'Matches “general check-up”', slot: 'Today, 1:30 PM' },
                    { initials: 'PM', name: 'Dr. Paolo Mendoza', spec: 'Endocrinology', why: 'Matches “ongoing fatigue”', slot: 'Thursday, 10:00 AM' },
                  ].map((d) => (
                    <li key={d.initials} className="flex items-center gap-3 py-3.5">
                      <Avatar initials={d.initials} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-text-primary">{d.name}</span>
                        <span className="block truncate text-xs text-text-muted">
                          {d.spec} · {d.why}
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-full bg-support-100 px-2.5 py-1 text-xs font-medium text-support-700 sm:block">
                        {d.slot}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-border-subtle bg-surface-sunk">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary">
              How it works
            </h2>
            <p className="mt-3 text-text-muted">
              Four steps from a worry to a written record.
            </p>
          </div>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-card border border-border-subtle bg-surface p-5"
              >
                <span className="text-xs font-semibold tracking-widest text-brand-600">
                  {step.n}
                </span>
                <h3 className="mt-2 text-base font-semibold text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-b border-border-subtle">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-text-primary">
              What you get
            </h2>
            <p className="mt-3 text-text-muted">
              The whole path — discovery, booking, the consultation itself, and
              everything it leaves behind.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-card border border-border-subtle bg-surface p-5">
                <h3 className="text-base font-semibold text-text-primary">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust, safety and the prototype disclaimer */}
      <section className="border-b border-border-subtle bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-text-primary">
                Privacy &amp; safety
              </h2>
              <p className="mt-3 text-text-muted">
                Health data deserves a higher bar than most products clear. Here
                is what we actually do.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-card border border-border-subtle bg-surface p-5">
                <h3 className="text-base font-semibold text-text-primary">
                  Your record is not browsable
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  A doctor can only open your history if they hold an
                  appointment with you. That rule is enforced on the server for
                  every single request, not just hidden in the interface.
                </p>
              </div>

              <div className="rounded-card border border-border-subtle bg-surface p-5">
                <h3 className="text-base font-semibold text-text-primary">
                  Nothing leaves the application
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">
                  Sign-in, matching, scheduling, notifications, the consultation
                  room and your medical records all run inside reMEDyo. No
                  third-party service receives your data, because there is no
                  third-party service.
                </p>
              </div>

              <div className="rounded-card border border-alert-200 bg-alert-50 p-5">
                <h3 className="text-base font-semibold text-alert-900">
                  If this is an emergency, do not use reMEDyo
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-alert-900">
                  For chest pain, difficulty breathing, severe bleeding, loss of
                  consciousness or any situation you believe is life-threatening,
                  contact your local emergency services immediately. A scheduled
                  online consultation is not the right tool and waiting for one
                  could cost you.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <PrototypeDisclaimer />
          </div>
        </div>
      </section>

      {/* Closing call to action */}
      <section className="bg-brand-900">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Start with what is bothering you.
              </h2>
              <p className="mt-3 text-brand-50">
                Create an account, describe the concern, and see which doctors
                fit — it takes about a minute.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/register/patient"
                size="lg"
                className="!bg-surface !text-brand-900 hover:!bg-brand-50"
              >
                Create a patient account
              </ButtonLink>
              <ButtonLink
                href="/register/doctor"
                size="lg"
                variant="ghost"
                className="!text-text-on-brand hover:!bg-brand-600"
              >
                Join as a doctor
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
