/**
 * The prototype disclaimer.
 *
 * The product-website spec requires this to be present without the visitor
 * expanding, scrolling past a fold, or dismissing anything — so it is plain
 * markup in the page, never a modal and never collapsed.
 */
export function PrototypeDisclaimer({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="rounded-lg border border-alert-200 bg-alert-50 px-3 py-2 text-xs text-alert-900">
        <strong className="font-semibold">Fictional prototype.</strong> Doctors,
        records and prescriptions here are invented. Not for real medical use.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border-2 border-alert-200 bg-alert-50 p-5">
      <h3 className="text-base font-semibold text-alert-900">
        This is a fictional prototype
      </h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-alert-900/90">
        <p>
          reMEDyo was built as a demonstration exercise. Every doctor profile,
          credential, appointment, consultation note and prescription in this
          application is fabricated. None of the clinicians listed are real
          people, and no prescription issued here is valid for dispensing at any
          pharmacy.
        </p>
        <p>
          Nothing in this application is medical advice, and it must not be used
          to make any real decision about your health or anyone else&rsquo;s. If
          you have a genuine medical concern, see a licensed clinician. If it is
          an emergency, contact your local emergency services.
        </p>
      </div>
    </div>
  );
}
