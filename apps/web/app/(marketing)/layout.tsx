import Link from 'next/link';
import { ButtonLink } from '@/components/ui';
import { Logo } from '@/components/ui/logo';

/**
 * Public shell. Server-rendered: the landing page is a trust surface, and it
 * should paint immediately rather than flash a loading skeleton.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2" aria-label="reMEDyo home">
            <Logo />
          </Link>

          <nav className="flex items-center gap-1 sm:gap-2">
            <ButtonLink href="/register/doctor" variant="ghost" size="sm" className="hidden sm:inline-flex">
              For doctors
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register/patient" size="sm">
              Get started
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border-subtle bg-surface-sunk">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-xs">
              <Logo />
              <p className="mt-3 text-sm text-text-muted">
                A telehealth prototype built for the 10x Onboarding exercise.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
              <div>
                <p className="font-semibold text-text-primary">Patients</p>
                <ul className="mt-2 space-y-1.5 text-text-muted">
                  <li><Link href="/register/patient" className="hover:text-brand-900">Create an account</Link></li>
                  <li><Link href="/login" className="hover:text-brand-900">Sign in</Link></li>
                  <li><Link href="/#how-it-works" className="hover:text-brand-900">How it works</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary">Doctors</p>
                <ul className="mt-2 space-y-1.5 text-text-muted">
                  <li><Link href="/register/doctor" className="hover:text-brand-900">Join as a doctor</Link></li>
                  <li><Link href="/login" className="hover:text-brand-900">Doctor sign in</Link></li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-text-primary">Legal</p>
                <ul className="mt-2 space-y-1.5 text-text-muted">
                  <li><Link href="/terms" className="hover:text-brand-900">Terms of service</Link></li>
                  <li><Link href="/privacy" className="hover:text-brand-900">Privacy policy</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-border-subtle pt-6 text-sm text-text-muted">
            <p>
              &copy; {new Date().getFullYear()} reMEDyo. A fictional prototype — not a
              real medical service.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
