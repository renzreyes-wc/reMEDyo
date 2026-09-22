/**
 * Wordmark. Drawn inline as SVG so the landing page pulls no external asset
 * and renders identically with no network access.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="30" height="30" rx="10" fill="var(--color-brand-600)" />
        <path
          d="M15 8.5v13M8.5 15h13"
          stroke="var(--color-text-on-brand)"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight text-text-primary">
        re<span className="text-brand-600">MED</span>yo
      </span>
    </span>
  );
}
