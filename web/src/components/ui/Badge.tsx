import type { ReactNode } from 'react';

export type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'accent';

const TONES: Record<Tone, string> = {
  neutral: 'border-line-strong bg-white/[0.04] text-mist-300',
  success: 'border-positive/25 bg-positive/10 text-positive',
  danger: 'border-negative/25 bg-negative/10 text-negative',
  warning: 'border-warn/25 bg-warn/10 text-warn',
  info: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
  accent: 'border-accent/30 bg-accent/12 text-accent-soft',
};

const DOTS: Record<Tone, string> = {
  neutral: 'bg-mist-400',
  success: 'bg-positive',
  danger: 'bg-negative',
  warning: 'bg-warn',
  info: 'bg-sky-400',
  accent: 'bg-accent-soft',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  pulse = false,
  icon,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-medium',
        TONES[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {dot && <span className={['h-1.5 w-1.5 rounded-full', DOTS[tone], pulse ? 'animate-pulse-soft' : ''].join(' ')} />}
      {icon}
      {children}
    </span>
  );
}

/** Pin status → label + tone. */
const STATUS_MAP: Record<string, { label: string; tone: Tone; pulse?: boolean }> = {
  pending: { label: 'Pending', tone: 'warning', pulse: true },
  running: { label: 'Scanning', tone: 'info', pulse: true },
  finished: { label: 'Finished', tone: 'success' },
  expired: { label: 'Expired', tone: 'neutral' },
  clean: { label: 'Clean', tone: 'success' },
  suspicious: { label: 'Suspicious', tone: 'warning' },
  cheating: { label: 'Cheating', tone: 'danger' },
  none: { label: 'None', tone: 'neutral' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const entry = STATUS_MAP[status] || { label: status, tone: 'neutral' as Tone };
  return (
    <Badge tone={entry.tone} dot pulse={entry.pulse} className={className}>
      {entry.label}
    </Badge>
  );
}

/** Verdict badge (used in tables and the report header). */
export function VerdictBadge({ verdict }: { verdict?: string | null }) {
  if (!verdict) return <span className="text-mist-500">—</span>;
  return <StatusBadge status={verdict} />;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const tone: Tone = severity === 'instance' || severity === 'critical' ? 'danger' : severity === 'warning' ? 'warning' : 'neutral';
  const label = severity === 'instance' ? 'In instance' : severity === 'critical' ? 'Critical' : severity === 'warning' ? 'Warning' : 'Boot';
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export default Badge;
