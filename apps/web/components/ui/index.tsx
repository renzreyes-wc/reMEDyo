/**
 * Shared UI primitives.
 *
 * Deliberately small: a handful of building blocks the feature folders
 * compose, rather than a component library. Everything reads from the
 * semantic token tier in globals.css — never a raw palette step, and never an
 * opacity modifier standing in for a colour that should have a name.
 *
 * Colour carries meaning in this product, so the tones below are not
 * interchangeable. `warning` is reserved for safety and prototype notices;
 * `info` and `support` are for ordinary informational elements; peach is
 * artwork only and appears nowhere in this file as a badge or status surface.
 */

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-text-on-brand hover:bg-brand-900 active:bg-brand-900',
  secondary:
    'border border-border-subtle bg-surface text-text-primary hover:bg-brand-50 hover:border-border-strong',
  ghost: 'text-text-muted hover:bg-brand-50 hover:text-brand-900',
  danger: 'border border-danger-200 bg-danger-50 text-danger-700 hover:bg-danger-100',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
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

/** Elevation is one of three steps. `raised` is the default for a card. */
export function Card({
  className = '',
  elevation = 'raised',
  children,
}: {
  className?: string;
  elevation?: 'flat' | 'raised' | 'floating';
  children: ReactNode;
}) {
  const shadow =
    elevation === 'flat'
      ? ''
      : elevation === 'floating'
        ? 'shadow-floating'
        : 'shadow-raised';
  return (
    <div
      className={`rounded-card border border-border-subtle bg-surface ${shadow} ${className}`}
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
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-subtle px-6 py-5">
      <div>
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/**
 * Badge tones.
 *
 * `warning` is the alert hue and means safety or prototype status — nothing
 * else. Informational and neutral states use the support hue so they stop
 * borrowing amber. There is deliberately no peach tone: a decorative colour
 * must never read as a status.
 */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'bg-support-100 text-support-700',
  brand: 'bg-brand-50 text-brand-900',
  success: 'bg-brand-100 text-brand-900',
  warning: 'bg-alert-100 text-alert-900',
  danger: 'bg-danger-50 text-danger-700',
  info: 'bg-support-100 text-support-700',
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
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Initials avatar, rendered by the application from the person's name, so no
 * external image host is involved anywhere in the product.
 */
export function Avatar({
  initials,
  size = 'md',
  tone = 'brand',
}: {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'brand' | 'support';
}) {
  const sizes = {
    sm: 'h-9 w-9 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-15 w-15 text-lg',
  };
  const tones = {
    brand: 'bg-brand-100 text-brand-900',
    support: 'bg-support-100 text-support-700',
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
      <span className="mb-2 flex items-center gap-1 text-sm font-semibold text-text-primary">
        {label}
        {required ? <span className="text-danger-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-sm text-danger-700">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-sm text-text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

/**
 * The control border is `border-strong`, which clears 3:1 against its
 * surface. A form control whose boundary a reader cannot see is not a
 * usable control, whatever it looks like.
 */
export const inputClass =
  'w-full rounded-md border border-border-strong bg-surface px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-focus-ring disabled:bg-surface-sunk disabled:text-text-muted';

export function Input({ className = '', ...props }: ComponentProps<'input'>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Textarea({ className = '', ...props }: ComponentProps<'textarea'>) {
  return <textarea className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }: ComponentProps<'select'>) {
  return <select className={`${inputClass} ${className}`} {...props} />;
}

/**
 * `warning` and `danger` keep their reserved meanings. `info` sits on the
 * support hue so an ordinary notice cannot be mistaken for a safety one.
 */
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
    info: 'border-support-300 bg-support-100 text-support-700',
    warning: 'border-alert-200 bg-alert-50 text-alert-900',
    danger: 'border-danger-200 bg-danger-50 text-danger-700',
    success: 'border-brand-300 bg-brand-50 text-brand-900',
  };
  return (
    <div className={`rounded-md border px-4 py-3.5 text-sm ${tones[tone]}`} role="status">
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? 'mt-1' : ''}>{children}</div> : null}
    </div>
  );
}

/**
 * Empty states are a product decision, not a fallback — several specs require
 * an explanatory empty state rather than a blank panel. The peach mark is the
 * one place a decorative hue appears, and it carries no meaning.
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
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-border-subtle bg-surface px-6 py-14 text-center">
      <span
        aria-hidden="true"
        className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-peach"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 6v12M6 12h12"
            stroke="#17332c"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.45"
          />
        </svg>
      </span>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-subtle border-t-brand-600" />
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
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
