import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Card from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Badge, SeverityBadge, VerdictBadge } from '../components/ui/Badge';
import { EmptyState, Skeleton, Tabs } from '../components/ui/Controls';
import { api } from '../lib/api';
import { relativeTime } from '../lib/format';
import type { DetectionsResponse } from '../lib/types';

type Severity = 'all' | 'instance' | 'warning' | 'boot';

export default function Detections() {
  const [severity, setSeverity] = useState<Severity>('all');
  const [data, setData] = useState<DetectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (next: Severity) => {
    setLoading(true);
    try {
      setData(await api.stats.detections(next, 100));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(severity);
  }, [load, severity]);

  const counts = data?.counts ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        icon="cpu"
        title="Detections"
        description="Every finding collected from your finished scans, grouped by severity."
        actions={
          <Button variant="ghost" icon="refresh" onClick={() => void load(severity)}>
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ['Total', counts.all ?? 0, 'text-mist-100', 'database'],
            ['In instance', counts.instance ?? 0, 'text-negative', 'alert'],
            ['Warnings', counts.warning ?? 0, 'text-warn', 'info'],
            ['Boot', counts.boot ?? 0, 'text-mist-200', 'shield'],
          ] as const
        ).map(([label, value, tone, icon]) => (
          <div key={label} className="card p-4">
            <p className="flex items-center gap-2 label-xs">
              <Icon name={icon} size={13} className="text-mist-500" />
              {label}
            </p>
            <p className={['mt-2.5 text-[26px] font-semibold leading-none tracking-tight', tone].join(' ')}>{value}</p>
          </div>
        ))}
      </div>

      <Card padded={false}>
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-[13px] text-mist-300">
            {data ? `${data.items.length} detection${data.items.length === 1 ? '' : 's'}` : 'Loading…'}
          </p>
          <Tabs
            value={severity}
            onChange={setSeverity}
            tabs={[
              { value: 'all', label: 'All', count: counts.all },
              { value: 'instance', label: 'In instance', count: counts.instance },
              { value: 'warning', label: 'Warning', count: counts.warning },
              { value: 'boot', label: 'Boot', count: counts.boot },
            ]}
          />
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : (data?.items.length ?? 0) === 0 ? (
          <EmptyState
            icon="shield"
            title="No detections"
            description="Nothing has been flagged yet. Detections appear here as soon as your scans finish."
          />
        ) : (
          <ul className="divide-y divide-line border-t border-line">
            {data?.items.map((item) => {
              const critical = item.severity === 'instance' || item.severity === 'critical';
              return (
                <li key={`${item.id}-${item.pin.code}`}>
                  <Link to={`/dashboard/pins/${item.pin.code}`} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025]">
                    <span
                      className={[
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        critical
                          ? 'border-negative/25 bg-negative/10 text-negative'
                          : item.severity === 'warning'
                            ? 'border-warn/25 bg-warn/10 text-warn'
                            : 'border-line bg-white/[0.03] text-mist-400',
                      ].join(' ')}
                    >
                      <Icon name={critical ? 'alert' : item.severity === 'warning' ? 'info' : 'file'} size={15} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={['text-[13.5px] font-medium', critical ? 'text-negative' : 'text-mist-100'].join(' ')}>{item.title}</p>
                        <SeverityBadge severity={item.severity} />
                      </div>
                      {item.detail && <p className="mt-1 break-words font-mono text-[12px] leading-relaxed text-mist-400">{item.detail}</p>}
                      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-mist-500">
                        <span className="font-mono text-mist-400">{item.pin.code}</span>
                        <span>· {item.pin.player}</span>
                        <span>· {item.pin.game}</span>
                        <span>· {relativeTime(item.createdAt)}</span>
                      </p>
                    </div>

                    <div className="hidden shrink-0 items-center gap-2 sm:flex">
                      <VerdictBadge verdict={item.pin.verdict} />
                      {item.pin.riskScore !== null && <Badge tone="neutral">{item.pin.riskScore}%</Badge>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
