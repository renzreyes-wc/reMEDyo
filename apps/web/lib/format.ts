/** Display helpers. Dates cross the wire as ISO strings and convert here. */

const dateFmt = new Intl.DateTimeFormat('en-PH', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-PH', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

const dayFmt = new Intl.DateTimeFormat('en-PH', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatDate(iso: string | Date): string {
  return dateFmt.format(new Date(iso));
}

export function formatTime(iso: string | Date): string {
  return timeFmt.format(new Date(iso));
}

export function formatDay(iso: string | Date): string {
  return dayFmt.format(new Date(iso));
}

export function formatDateTime(iso: string | Date): string {
  return `${formatDate(iso)} at ${formatTime(iso)}`;
}

export function formatRange(startIso: string, endIso: string): string {
  return `${formatDate(startIso)}, ${formatTime(startIso)}–${formatTime(endIso)}`;
}

/** "in 12 minutes", "3 days ago" — used on notifications and appointments. */
export function relativeTime(iso: string | Date): string {
  const target = new Date(iso).getTime();
  const diffMs = target - Date.now();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);

  if (minutes < 1) return diffMs >= 0 ? 'in a moment' : 'just now';
  if (minutes < 60) {
    return diffMs >= 0 ? `in ${minutes} min` : `${minutes} min ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return diffMs >= 0 ? `in ${hours} h` : `${hours} h ago`;
  }
  const days = Math.round(hours / 24);
  if (days < 30) {
    return diffMs >= 0 ? `in ${days} d` : `${days} d ago`;
  }
  return formatDate(iso);
}

export function formatPeso(amount: number | string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Minutes from midnight -> "09:00". Availability windows store minutes. */
export function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
