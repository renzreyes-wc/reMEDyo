import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
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
      <section className="relative overflow-hidden border-b border-ink-100">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_75%_-10%,var(--color-brand-50),transparent)]"
        />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800">
                Telehealth, end to end
              </span>

              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
                Talk to a doctor,
                <br />
                without the waiting room.
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
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

              <p className="mt-4 text-sm text-ink-500">
                Already with us?{' '}
                <Link href="/login" className="font-medium text-brand-700 underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>

            {/* An honest sketch of the product, drawn in markup rather than
                shipped as a screenshot from an image host. */}
            <div className="relative">
              <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-[0_18px_40px_-24px_rgba(16,40,34,0.45)]">
                <div className="flex items-center justify-between border-b border-ink-100 pb-3">
                  <p className="text-sm font-semibold text-ink-900">Suggested for you</p>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    3 matches
                  </span>
                </div>

                <ul className="divide-y divide-ink-100">
                  {[
                    { initials: 'AC', name: 'Dr. Antonio Cruz', spec: 'Cardiology', why: 'Matches “chest tightness”', slot: 'Tomorrow, 9:00 AM' },
                    { initials: 'MS', name: 'Dr. Maria Santos', spec: 'General Practice', why: 'Matches “general check-up”', slot: 'Today, 1:30 PM' },
                    { initials: 'PM', name: 'Dr. Paolo Mendoza', spec: 'Endocrinology', why: 'Matches “ongoing fatigue”', slot: 'Thursday, 10:00 AM' },
                  ].map((d) => (
                    <li key={d.initials} className="flex items-center gap-3 py-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800">
                        {d.initials}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{d.name}</span>
                        <span className="block truncate text-xs text-ink-500">
                          {d.spec} · {d.why}
                        </span>
                      </span>
                      <span className="hidden shrink-0 rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-600 sm:block">
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
      <section id="how-it-works" className="border-b border-ink-100 bg-ink-50/50">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
              How it works
            </h2>
            <p className="mt-3 text-ink-600">
              Four steps from a worry to a written record.
            </p>
          </div>

          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-[var(--radius-card)] border border-ink-200/70 bg-white p-5"
              >
                <span className="text-xs font-semibold tracking-widest text-brand-600">
                  {step.n}
                </span>
                <h3 className="mt-2 text-base font-semibold text-ink-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-b border-ink-100">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
              What you get
            </h2>
            <p className="mt-3 text-ink-600">
              The whole path — discovery, booking, the consultation itself, and
              everything it leaves behind.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c) => (
              <div key={c.title} className="rounded-[var(--radius-card)] border border-ink-200/70 bg-white p-5">
                <h3 className="text-base font-semibold text-ink-900">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust, safety and the prototype disclaimer */}
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-ink-900">
                Privacy &amp; safety
              </h2>
              <p className="mt-3 text-ink-600">
                Health data deserves a higher bar than most products clear. Here
                is what we actually do.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-[var(--radius-card)] border border-ink-200/70 bg-white p-5">
                <h3 className="text-base font-semibold text-ink-900">
                  Your record is not browsable
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  A doctor can only open your history if they hold an
                  appointment with you. That rule is enforced on the server for
                  every single request, not just hidden in the interface.
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-ink-200/70 bg-white p-5">
                <h3 className="text-base font-semibold text-ink-900">
                  Nothing leaves the application
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Sign-in, matching, scheduling, notifications, the consultation
                  room and your medical records all run inside reMEDyo. No
                  third-party service receives your data, because there is no
                  third-party service.
                </p>
              </div>

              <div className="rounded-[var(--radius-card)] border border-alert-200 bg-alert-50 p-5">
                <h3 className="text-base font-semibold text-alert-900">
                  If this is an emergency, do not use reMEDyo
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-alert-900/90">
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
      <section className="bg-brand-950">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold tracking-tight text-white">
                Start with what is bothering you.
              </h2>
              <p className="mt-3 text-brand-100">
                Create an account, describe the concern, and see which doctors
                fit — it takes about a minute.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink
                href="/register/patient"
                size="lg"
                className="!bg-white !text-brand-900 hover:!bg-brand-50"
              >
                Create a patient account
              </ButtonLink>
              <ButtonLink
                href="/register/doctor"
                size="lg"
                variant="ghost"
                className="!text-white hover:!bg-white/10"
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
