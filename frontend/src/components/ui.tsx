import type { ReactNode } from 'react';
import type { BandKey, ListedBand } from '../lib/types';

const BAND_STYLE: Record<ListedBand, { label: string; className: string }> = {
  best_fit: { label: 'Best fit', className: 'border-best text-best' },
  safe: { label: 'Safe', className: 'border-safe text-safe' },
  stretch: { label: 'Stretch', className: 'border-stretch text-stretch' },
  excluded: { label: 'Excluded', className: 'border-excluded text-excluded' },
  no_data: { label: 'No cut-off data', className: 'border-excluded text-excluded' },
};

export const bandLabel = (band: ListedBand): string => BAND_STYLE[band].label;

/** The band named in words, with a colour as a second signal. */
export function BandBadge({ band }: { band: ListedBand }) {
  const s = BAND_STYLE[band];
  return <span className={`chip ${s.className}`}>{s.label}</span>;
}

export const BAND_BAR: Record<BandKey, string> = {
  best_fit: 'bg-best',
  safe: 'bg-safe',
  stretch: 'bg-stretch',
  excluded: 'bg-excluded',
};

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'error' | 'warn'; children: ReactNode }) {
  const style =
    kind === 'error' ? 'border-danger text-danger' : kind === 'warn' ? 'border-stretch text-ink' : 'border-line text-muted';
  return (
    <div role={kind === 'error' ? 'alert' : 'status'} className={`rounded-md border px-3 py-2 text-sm ${style}`}>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <p role="status" className="text-sm text-muted">
      {label}...
    </p>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="font-display text-2xl font-semibold">{value}</div>
      {hint ? <div className="text-xs text-muted">{hint}</div> : null}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-4">
      <h1 className="font-display text-2xl font-semibold sm:text-3xl">{children}</h1>
      {sub ? <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p> : null}
    </header>
  );
}
