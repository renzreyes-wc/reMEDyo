/**
 * Shared UI primitives.
 *
 * Deliberately small: a handful of building blocks the feature folders compose,
 * rather than a component library. Everything is plain Tailwind on the tokens
 * declared in globals.css, so the visual language stays in one place.
 */

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
  secondary:
    'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50 hover:border-ink-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
  danger:
    'border border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = '',
): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${extra}`;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({
  className = '',
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-ink-200/70 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div>
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-brand-100 text-brand-800',
  warning: 'bg-alert-100 text-alert-900',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-ink-100 text-ink-700',
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Initials avatar. Rendered by the application from the person's name, so no
 * external image host is involved anywhere in the product.
 */
export function Avatar({
  initials,
  size = 'md',
  tone = 'brand',
}: {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'ink';
}) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
  };
  const tones = {
    brand: 'bg-brand-100 text-brand-800',
    ink: 'bg-ink-200 text-ink-700',
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${tones[tone]}`}
    >
      {initials || '··'}
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-ink-800">
        {label}
        {required ? <span className="text-danger-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-sm text-danger-700">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-sm text-ink-500">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-ink-50';

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: ReactNode;
  children?: ReactNode;
}) {
  const tones = {
    info: 'border-ink-200 bg-ink-50 text-ink-800',
    warning: 'border-alert-200 bg-alert-50 text-alert-900',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
    success: 'border-brand-200 bg-brand-50 text-brand-800',
  };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]}`} role="status">
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  );
}

/**
 * Empty states are a product decision, not a fallback. Several specs require
 * an explanatory empty state rather than a blank panel or an error.
 */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-800">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" />
      {label}
    </div>
  );
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
