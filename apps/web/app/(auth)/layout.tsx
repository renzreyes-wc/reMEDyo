import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { PrototypeDisclaimer } from '@/components/ui/disclaimer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-ink-100">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" aria-label="reMEDyo home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="w-full max-w-lg">
          {children}
          <div className="mt-6">
            <PrototypeDisclaimer compact />
          </div>
        </div>
      </main>
    </div>
  );
}
