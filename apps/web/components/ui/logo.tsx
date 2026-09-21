/**
 * Wordmark. Drawn inline as SVG so the landing page pulls no external asset
 * and renders identically with no network access.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="8" fill="var(--color-brand-600)" />
        <path
          d="M14 7.5v13M7.5 14h13"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-lg font-semibold tracking-tight text-ink-900">
        re<span className="text-brand-600">MED</span>yo
      </span>
    </span>
  );
}
