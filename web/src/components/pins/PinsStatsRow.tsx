import Icon from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/Controls';
import { formatNumber, formatSigned, percent } from '../../lib/format';
import type { Stats } from '../../lib/types';

function Sparkline({ values, tone = 'accent' }: { values: number[]; tone?: 'accent' | 'positive' | 'negative' }) {
  const max = Math.max(1, ...values);
  const color = tone === 'positive' ? '#22c55e' : tone === 'negative' ? '#ef4444' : '#3b82f6';
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {values.map((value, index) => (
        <span
          key={index}
          className="w-[4px] rounded-sm"
          style={{ height: `${Math.max(12, (value / max) * 100)}%`, background: color, opacity: 0.35 + (index / values.length) * 0.65 }}
        />
      ))}
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  tone = 'default',
  children,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  children?: React.ReactNode;
}) {
  const valueTone =
    tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : tone === 'warning' ? 'text-warn' : 'text-mist-100';
  return (
    <div className="card card-hover p-4">
      <div className="flex items-center gap-2 text-mist-400">
        {icon}
        <span className="label-xs">{label}</span>
      </div>
      <div className={['mt-3 text-[27px] font-semibold leading-none tracking-tight', valueTone].join(' ')}>{value}</div>
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/**
 * The five tiles above the pins table: Daily / Total / Pending / Finished / Expired.
 */
export function PinsStatsRow({ stats, onShowPending }: { stats: Stats; onShowPending?: () => void }) {
  const quotaLabel = stats.daily.unlimited ? 'Unlimited' : stats.daily.quota === 0 ? '0 pins' : `${stats.daily.used}/${stats.daily.quota}`;
  const dailyPercent = stats.daily.unlimited ? Math.min(100, stats.daily.used * 8) : percent(stats.daily.used, stats.daily.quota || 1);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Tile label="Daily Pins" icon={<Icon name="pin" size={14} />} value={stats.daily.unlimited ? formatNumber(stats.daily.used) : quotaLabel}>
        {stats.daily.unlimited ? (
          <>
            <ProgressBar value={dailyPercent} tone="positive" />
            <p className="mt-2 text-[12px] text-mist-500">Unlimited daily pins · resets at midnight</p>
          </>
        ) : (
          <>
            <ProgressBar value={0} tone="warning" />
            <p className="mt-2 text-[12px] text-warn">License required to create pins</p>
          </>
        )}
      </Tile>

      <Tile
        label="Total Pins"
        icon={<Icon name="activity" size={14} />}
        value={formatNumber(stats.total)}
        tone={stats.total > 0 ? 'default' : 'default'}
      >
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-mist-500">vs last month</span>
          <Badge tone={stats.growth >= 0 ? 'success' : 'danger'}>{formatSigned(stats.growth)}</Badge>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink-900/70 p-2 text-center">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-mist-500">Last month</p>
            <p className="font-mono text-[13px] text-mist-200">{stats.lastMonth}</p>
          </div>
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-mist-500">Current</p>
            <p className="font-mono text-[13px] text-mist-100">{stats.thisMonth}</p>
          </div>
        </div>
      </Tile>

      <Tile label="Pending" icon={<Icon name="clock" size={14} />} value={formatNumber(stats.pending)} tone={stats.pending > 0 ? 'warning' : 'default'}>
        <p className="text-[12px] text-mist-500">{stats.pending === 0 ? 'No pins waiting' : 'Needs attention'}</p>
        {stats.pending > 0 ? (
          <button type="button" onClick={onShowPending} className="mt-2 text-[12.5px] font-medium text-accent-soft hover:text-white">
            View pending →
          </button>
        ) : (
          <div className="mt-3">
            <Sparkline values={[0, 0, 0, 0, 0, 0, 0]} tone="accent" />
          </div>
        )}
      </Tile>

      <Tile label="Finished" icon={<Icon name="check" size={14} />} value={formatNumber(stats.finished)} tone="positive">
        <p className="text-[12px] text-mist-500">{stats.completionRate}% completion rate</p>
        <div className="mt-3 flex items-center justify-between">
          <Sparkline values={[1, 2, 1, 3, 2, 4, Math.max(1, stats.finished)]} tone="positive" />
          <span className="text-[11.5px] text-positive">+{stats.finishedThisWeek} this week</span>
        </div>
      </Tile>

      <Tile label="Expired" icon={<Icon name="alert" size={14} />} value={formatNumber(stats.expired)} tone={stats.expired > 0 ? 'negative' : 'default'}>
        <p className="text-[12px] text-mist-500">{percent(stats.expired, stats.total)}% of all pins</p>
        <div className="mt-3 flex items-center gap-2 text-[11.5px] text-mist-400">
          <Icon name="info" size={13} className="text-mist-500" />
          Pins expire after 24 hours
        </div>
      </Tile>
    </div>
  );
}

export default PinsStatsRow;
