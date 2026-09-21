import type { Metadata } from 'next';
import { PrototypeDisclaimer } from '@/components/ui/disclaimer';

export const metadata: Metadata = { title: 'Privacy policy' };

export default function PrivacyPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
        Privacy policy
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Last updated 21 September 2026
      </p>

      <div className="mt-8">
        <PrototypeDisclaimer />
      </div>

      <div className="mt-10 space-y-8 text-ink-700">
        <section>
          <h2 className="text-xl font-semibold text-ink-900">What we store</h2>
          <p className="mt-2 leading-relaxed">
            All data lives in a single PostgreSQL database owned by this
            application. For a patient that is: the email address you registered
            with, a one-way hash of your password, your name, date of birth,
            contact number, weight, height, any medical history you choose to
            enter, your appointments, and the consultation notes and
            prescriptions your doctors write. For a doctor it is your
            professional profile, specializations, licence identifier,
            availability and the records you author.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">
            Your password is never stored
          </h2>
          <p className="mt-2 leading-relaxed">
            Only a salted one-way hash of it is kept. It cannot be reversed, it
            is never returned by any part of the API, and nobody — including an
            administrator — can read it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">Who can see your record</h2>
          <p className="mt-2 leading-relaxed">
            You can always read your own record. A doctor can read it only if
            they hold at least one appointment with you, past or upcoming — that
            check runs on the server for every request. Administrators can see
            account status and appointment scheduling information for oversight,
            and their actions are written to an audit log; they are not given a
            route to read your consultation notes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">
            No third parties are involved
          </h2>
          <p className="mt-2 leading-relaxed">
            This application uses no external analytics, no advertising, no
            tracking pixels, no third-party fonts or image hosts, and no
            outside service for authentication, scheduling, messaging,
            notifications or storage. Nothing about you is sent anywhere else,
            because there is nowhere else for it to go. The page you are reading
            renders completely with no internet access at all.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">Cookies</h2>
          <p className="mt-2 leading-relaxed">
            One cookie is set, when you sign in: a session token. It is marked
            httpOnly, so no script on the page can read it, and it expires after
            two hours. There are no other cookies.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">Retention</h2>
          <p className="mt-2 leading-relaxed">
            Consultation notes, prescriptions and audit entries are retained
            rather than deleted, so a clinical record cannot quietly change
            after the fact; corrections are made as revisions. Because this is a
            prototype, the entire database may be reset without notice.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">
            Please do not enter real health data
          </h2>
          <p className="mt-2 leading-relaxed">
            This is a demonstration system with demonstration safeguards. Use
            fictional information.
          </p>
        </section>
      </div>
    </article>
  );
}
