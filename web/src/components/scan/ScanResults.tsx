import { useState } from 'react';
import Card, { CardHeader } from '../ui/Card';
import Icon from '../ui/Icon';
import { Badge, SeverityBadge } from '../ui/Badge';
import { Tabs } from '../ui/Controls';
import RadarChart from './RadarChart';
import { relativeTime } from '../../lib/format';
import type { PinDetail } from '../../lib/types';

/* ------------------------------- verdict hero ------------------------------ */

const VERDICT_COPY = {
  cheating: { label: 'Cheating', tone: 'negative', glow: 'rgba(239,68,68,0.22)', text: 'text-negative' },
  suspicious: { label: 'Suspicious', tone: 'warning', glow: 'rgba(245,158,11,0.2)', text: 'text-warn' },
  clean: { label: 'Legit', tone: 'positive', glow: 'rgba(34,197,94,0.18)', text: 'text-positive' },
} as const;

export function VerdictHero({ pin }: { pin: PinDetail }) {
  const verdict = (pin.verdict ?? 'clean') as keyof typeof VERDICT_COPY;
  const copy = VERDICT_COPY[verdict];

  return (
    <div
      className="relative flex min-w-[280px] flex-1 flex-col items-center justify-center overflow-hidden rounded-xl border border-line px-6 py-8 text-center"
      style={{ background: `radial-gradient(120% 120% at 50% 0%, ${copy.glow}, rgba(13,14,17,0.9) 65%)` }}
    >
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-900/70 ${copy.text}`}>
        <Icon name={verdict === 'clean' ? 'shield' : 'alert'} size={20} />
      </span>

      <p className={`mt-4 text-[30px] font-semibold leading-none tracking-[0.24em] ${copy.text}`}>{copy.label.toUpperCase()}</p>
      <p className="mt-3 text-[12.5px] text-mist-400">{pin.riskHistory ?? 0}% player risk history</p>

      <div className="mt-5 flex items-center gap-2">
        <Badge tone={copy.tone === 'negative' ? 'danger' : copy.tone === 'warning' ? 'warning' : 'success'} dot>
          Risk {pin.riskScore ?? 0}%
        </Badge>
        {pin.durationMs !== null && <Badge tone="neutral">{Math.round(pin.durationMs / 1000)}s scan</Badge>}
      </div>
    </div>
  );
}

/* ------------------------------- report body ------------------------------- */

const SEVERITY_TABS = [
  { value: 'all' as const, label: 'All' },
  { value: 'boot' as const, label: 'Boot' },
  { value: 'warning' as const, label: 'Warning' },
  { value: 'instance' as const, label: 'In instance' },
];

export function ScanResults({ pin }: { pin: PinDetail }) {
  const [severity, setSeverity] = useState<'all' | 'boot' | 'warning' | 'instance'>('all');

  const detections = pin.detections ?? [];
  const inline = detections.filter((entry) => entry.severity === 'instance' || entry.severity === 'critical').length;
  const warnings = detections.filter((entry) => entry.severity === 'warning').length;
  const boots = detections.filter((entry) => entry.severity === 'boot').length;
  const risk = pin.riskScore ?? 0;

  const axes = [
    { label: 'Detections', value: Math.max(risk, inline * 12) },
    { label: 'Warnings', value: Math.min(100, warnings * 22) },
    { label: 'Legit', value: Math.max(0, 100 - risk) },
  ];

  const tone = pin.verdict === 'cheating' ? 'danger' : pin.verdict === 'suspicious' ? 'warning' : 'positive';
  const filtered = severity === 'all' ? detections : detections.filter((entry) => entry.severity === severity);

  const breakdown = Object.entries(pin.detectionBreakdown?.byCategory ?? {});
  const breakdownTotal = pin.detectionBreakdown?.total ?? detections.length;

  const pcRows: [string, string | null | undefined][] = [
    ['System', pin.pcInfo?.os],
    ['Install date', pin.pcInfo?.installDate],
    ['Game', pin.pcInfo?.game ?? pin.game],
    ['Window text', pin.pcInfo?.windowText],
  ];

  const hardware: [string, string | null | undefined][] = [
    ['CPU', pin.pcInfo?.cpu],
    ['GPU', pin.pcInfo?.gpu],
    ['RAM', pin.pcInfo?.ram],
    ['Disk', pin.pcInfo?.disk],
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        {/* Scan overview */}
        <Card>
          <CardHeader
            title="Scan overview"
            subtitle="Interactive overview of the forensic findings."
            icon={<Icon name="radar" size={15} className="text-mist-500" />}
            action={
              <Badge tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : 'success'}>
                {detections.length} detection{detections.length === 1 ? '' : 's'}
              </Badge>
            }
          />

          <div className="mt-2">
            {/* Axis values stay hidden: the legend tiles below show the raw counts. */}
            <RadarChart axes={axes} tone={tone} size={270} showValues={false} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ['Detections', String(inline), 'negative', 'alert'],
                ['Warnings', String(warnings), 'warning', 'info'],
                // “Legit” is not measured by the collector — the reference UI shows a dash.
                ['Legit', '—', 'neutral', 'shield'],
              ] as const
            ).map(([label, value, toneName, iconName]) => (
              <div key={label} className="rounded-lg border border-line bg-ink-900/60 p-3">
                <p className="flex items-center gap-1.5 label-xs">
                  <Icon
                    name={iconName}
                    size={12}
                    className={toneName === 'negative' ? 'text-negative' : toneName === 'warning' ? 'text-warn' : 'text-mist-400'}
                  />
                  {label}
                </p>
                <p
                  className={[
                    'mt-1.5 text-[19px] font-semibold tracking-tight',
                    toneName === 'negative' ? 'text-negative' : toneName === 'warning' ? 'text-warn' : 'text-mist-200',
                  ].join(' ')}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* PC information */}
        <Card>
          <CardHeader
            title="PC Information"
            subtitle="Identity of the machine that ran the collector."
            icon={<Icon name="pc" size={15} className="text-mist-500" />}
            action={
              <span className="text-[12px] text-mist-500">
                {pin.status === 'finished' ? `Collected ${relativeTime(pin.finishedAt)}` : '—'}
              </span>
            }
          />

          <div className="mt-4 grid grid-cols-3 gap-3">
            {(
              [
                ['Boot time', pin.pcInfo?.bootTime],
                ['VPN', pin.pcInfo?.vpn],
                ['Recycle', pin.pcInfo?.recycleTime],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-lg border border-line bg-ink-900/60 p-3">
                <p className="label-xs">{label}</p>
                <p className="mt-1.5 font-mono text-[14px] text-mist-100">{value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
            {pcRows.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-3.5 py-2.5">
                <span className="text-[12.5px] text-mist-400">{label}</span>
                <span className="max-w-[60%] truncate text-right font-mono text-[12.5px] text-mist-100">{value || '—'}</span>
              </div>
            ))}
          </div>

          {hardware.some(([, value]) => Boolean(value)) && (
            <>
              <p className="label-xs mt-5">Hardware</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {hardware.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/50 px-3 py-2">
                    <span className="text-[12px] text-mist-500">{label}</span>
                    <span className="truncate text-[12.5px] text-mist-200">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
        {/* Detection breakdown */}
        <Card>
          <CardHeader title="Detection Results" subtitle="Grouped by source." />
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[30px] font-semibold leading-none tracking-tight text-mist-100">{breakdownTotal}</span>
            <span className="text-[12.5px] text-mist-500">findings</span>
          </div>

          <div className="mt-4 space-y-1.5">
            {breakdown.length === 0 ? (
              <p className="rounded-lg border border-line bg-ink-900/50 px-3 py-3 text-[12.5px] text-mist-500">
                No detections were recorded.
              </p>
            ) : (
              breakdown.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between rounded-lg border border-line bg-ink-900/60 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[12.5px] text-mist-300">
                    <Icon name="file" size={13} className="text-mist-500" />
                    {category}
                  </span>
                  <span className="font-mono text-[12.5px] text-mist-200">{count}</span>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2.5 border-t border-line pt-4">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-mist-400">In instance</span>
              <span className="font-mono text-negative">{inline}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-mist-400">Warnings</span>
              <span className="font-mono text-warn">{warnings}</span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-mist-400">Boot</span>
              <span className="font-mono text-mist-300">{boots}</span>
            </div>
          </div>
        </Card>

        {/* Detection list */}
        <Card padded={false}>
          <div className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <CardHeader title="Overview" subtitle={`${detections.length} detection${detections.length === 1 ? '' : 's'} recorded`} />
            <Tabs
              value={severity}
              onChange={setSeverity}
              tabs={SEVERITY_TABS.map((tab) => ({
                ...tab,
                count:
                  tab.value === 'all'
                    ? detections.length
                    : detections.filter((entry) => entry.severity === tab.value).length,
              }))}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="border-t border-line px-5 py-10 text-center text-[12.5px] text-mist-500">
              No detections in this category.
            </p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {filtered.map((detection) => {
                const critical = detection.severity === 'instance' || detection.severity === 'critical';
                return (
                  <li key={detection.id} className="flex items-start gap-4 px-5 py-4">
                    <span
                      className={[
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        critical
                          ? 'border-negative/25 bg-negative/10 text-negative'
                          : detection.severity === 'warning'
                            ? 'border-warn/25 bg-warn/10 text-warn'
                            : 'border-line bg-white/[0.03] text-mist-400',
                      ].join(' ')}
                    >
                      <Icon name={critical ? 'alert' : detection.severity === 'warning' ? 'info' : 'file'} size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={['text-[13.5px] font-medium', critical ? 'text-negative' : 'text-mist-100'].join(' ')}>
                          {detection.title}
                        </p>
                        <SeverityBadge severity={detection.severity} />
                      </div>
                      {detection.detail && <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-mist-400">{detection.detail}</p>}
                      <p className="mt-1 text-[11.5px] text-mist-500">
                        {detection.category ?? 'Overview'} · {relativeTime(detection.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ScanResults;
