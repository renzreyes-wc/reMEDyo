import type { Metadata } from 'next';
import { PrototypeDisclaimer } from '@/components/ui/disclaimer';

export const metadata: Metadata = { title: 'Terms of service' };

export default function TermsPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight text-ink-900">
        Terms of service
      </h1>
      <p className="mt-2 text-sm text-ink-500">
        Last updated 21 September 2026
      </p>

      <div className="mt-8">
        <PrototypeDisclaimer />
      </div>

      <div className="prose-remedyo mt-10 space-y-8 text-ink-700">
        <section>
          <h2 className="text-xl font-semibold text-ink-900">1. What reMEDyo is</h2>
          <p className="mt-2 leading-relaxed">
            reMEDyo is a demonstration telehealth application built as a
            technical exercise. It is not a licensed healthcare provider, not a
            medical device, and not a real clinical service. Access is offered
            for the purpose of evaluating the software itself.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">2. No medical advice</h2>
          <p className="mt-2 leading-relaxed">
            Nothing produced by this application — including doctor suggestions,
            consultation notes and prescriptions — constitutes medical advice,
            diagnosis or treatment. The symptom matching feature applies simple
            stored rules to route you toward a kind of specialist; it does not
            assess, diagnose or triage you, and it is not a substitute for a
            clinician&rsquo;s judgement.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">3. Emergencies</h2>
          <p className="mt-2 leading-relaxed">
            Do not use reMEDyo in an emergency. If you believe you or someone
            else is experiencing a medical emergency, contact your local
            emergency services immediately.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">4. Accounts</h2>
          <p className="mt-2 leading-relaxed">
            You are responsible for keeping your password confidential and for
            activity under your account. Doctor accounts are reviewed by an
            administrator before appearing in the directory; until then, a
            doctor profile is not listed and cannot receive bookings.
            Administrator accounts are provisioned at deployment and cannot be
            self-registered.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">5. Acceptable use</h2>
          <p className="mt-2 leading-relaxed">
            Do not enter real personal health information about yourself or
            anyone else into this prototype. Do not attempt to access records
            belonging to other users. Administrators may suspend or deactivate
            an account, with a recorded reason, where use is inconsistent with
            these terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">6. Prescriptions are not valid</h2>
          <p className="mt-2 leading-relaxed">
            Prescriptions created in this application are fictional demonstration
            data. They are labelled as such wherever they appear, they carry no
            prescriber authority, and they cannot be dispensed.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">7. Availability and liability</h2>
          <p className="mt-2 leading-relaxed">
            The application is provided as is, without warranty of any kind. It
            may be reset, taken down or changed without notice, and data entered
            into it may be deleted at any time.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-ink-900">8. Contact</h2>
          <p className="mt-2 leading-relaxed">
            Questions about this prototype should go to whoever provided you
            access to it. There is no support desk.
          </p>
        </section>
      </div>
    </article>
  );
}
