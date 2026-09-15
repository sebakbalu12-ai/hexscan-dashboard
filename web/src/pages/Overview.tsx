import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Card, { CardHeader } from '../components/ui/Card';
import { Badge, StatusBadge, VerdictBadge } from '../components/ui/Badge';
import { EmptyState, ProgressBar, Skeleton } from '../components/ui/Controls';
import PinsStatsRow from '../components/pins/PinsStatsRow';
import { api } from '../lib/api';
import { relativeTime } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { useUpgrade } from '../context/UpgradeContext';
import type { OverviewResponse } from '../lib/types';

export default function Overview() {
  const navigate = useNavigate();
  const { user, license, canCreatePin } = useAuth();
  const { open } = useUpgrade();

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.stats.overview());
      setError(null);
    } catch {
      setError('Could not load the dashboard overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = data?.stats;
  const verdicts = data?.verdicts ?? { cheating: 0, suspicious: 0, clean: 0 };
  const verdictTotal = verdicts.cheating + verdicts.suspicious + verdicts.clean;

  return (
    <div className="space-y-6">
      <PageHeader
        icon="grid"
        title={`Welcome back, ${user?.username ?? 'agent'}`}
        description="Overview of your scan pins, results and detections."
        badge={license?.active ? <Badge tone={license.lifetime ? 'success' : 'accent'} dot>{license.planLabel}</Badge> : <Badge tone="warning" dot>Free tier</Badge>}
        actions={
          <>
            <Button variant="ghost" icon="refresh" onClick={() => void load()}>
              Refresh
            </Button>
            <Button
              icon="plus"
              onClick={() =>
                canCreatePin
                  ? navigate('/dashboard/pins?create=1')
                  : open('Creating scan pins requires an active license. Choose a plan below to unlock unlimited pins.')
              }
            >
              Create Pin
            </Button>
          </>
        }
      />

      {!canCreatePin && (
        <div className="flex flex-col gap-3 rounded-xl border border-warn/25 bg-warn/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
              <Icon name="lock" size={16} />
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-mist-100">Pin creation is locked on the free tier</p>
              <p className="mt-0.5 text-[12.5px] text-mist-400">
                You can browse the dashboard and every past report. Activate a 1, 3, 6 month or lifetime license to generate
                unlimited pins.
              </p>
            </div>
          </div>
          <Button icon="key" onClick={() => open()}>
            View licenses
          </Button>
        </div>
      )}

      {loading || !stats ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-[132px] w-full" />
          ))}
        </div>
      ) : (
        <PinsStatsRow stats={stats} onShowPending={() => navigate('/dashboard/pins?status=pending')} />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        {/* Recent checks */}
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Recent checks"
              subtitle="Your latest scan pins and their results."
              action={
                <Link to="/dashboard/pins" className="flex items-center gap-1 text-[12.5px] font-medium text-accent-soft hover:text-white">
                  View all <Icon name="chevronRight" size={13} />
                </Link>
              }
            />
          </div>

          {loading ? (
            <div className="space-y-3 px-5 pb-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (data?.recent.length ?? 0) === 0 ? (
            <EmptyState
              icon="radar"
              title="No pins yet"
              description="Create your first pin and send the download link to the player you want to check."
              action={
                <Button icon="plus" onClick={() => (canCreatePin ? navigate('/dashboard/pins?create=1') : open())}>
                  Create Pin
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {data?.recent.map((pin) => (
                <li key={pin.id}>
                  <Link
                    to={`/dashboard/pins/${pin.code}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-mist-400">
                      <Icon name={pin.status === 'finished' ? 'shield' : pin.status === 'pending' ? 'clock' : 'scan'} size={16} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[13px] text-mist-100">{pin.code}</span>
                        <span className="truncate text-[13px] text-mist-300">· {pin.player}</span>
                      </div>
                      <p className="mt-0.5 text-[12px] text-mist-500">
                        {pin.game}
                        {pin.name ? ` · ${pin.name}` : ''} · {relativeTime(pin.createdAt)}
                      </p>
                    </div>

                    <div className="hidden items-center gap-2 sm:flex">
                      {pin.verdict && pin.riskScore !== null && (
                        <span className="font-mono text-[12px] text-mist-500">{pin.riskScore}%</span>
                      )}
                      {pin.status === 'finished' ? <VerdictBadge verdict={pin.verdict} /> : <StatusBadge status={pin.status} />}
                    </div>

                    <Icon name="chevronRight" size={15} className="text-mist-600" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          {/* Verdict split */}
          <Card>
            <CardHeader title="Verdicts" subtitle="Across all finished scans." icon={<Icon name="shield" size={15} className="text-mist-500" />} />
            {verdictTotal === 0 ? (
              <p className="mt-4 text-[12.5px] text-mist-500">No finished scans yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {(
                  [
                    ['Cheating', verdicts.cheating, 'negative'],
                    ['Suspicious', verdicts.suspicious, 'warning'],
                    ['Clean', verdicts.clean, 'positive'],
                  ] as const
                ).map(([label, value, tone]) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-[12.5px]">
                      <span className="text-mist-300">{label}</span>
                      <span className="font-mono text-mist-400">{value}</span>
                    </div>
                    <ProgressBar className="mt-1.5" value={(value / verdictTotal) * 100} tone={tone} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Detections */}
          <Card>
            <CardHeader
              title="Detections"
              subtitle="Findings collected from your pins."
              icon={<Icon name="cpu" size={15} className="text-mist-500" />}
              action={
                <Link to="/dashboard/detections" className="text-[12.5px] font-medium text-accent-soft hover:text-white">
                  Open
                </Link>
              }
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(
                [
                  ['Total', data?.detections.total ?? 0, 'default'],
                  ['In instance', data?.detections.inline ?? 0, 'danger'],
                  ['Warnings', data?.detections.warnings ?? 0, 'warning'],
                  ['Boot', data?.detections.boot ?? 0, 'neutral'],
                ] as const
              ).map(([label, value, tone]) => (
                <div key={label} className="rounded-lg border border-line bg-ink-900/60 p-3">
                  <p className="label-xs">{label}</p>
                  <p
                    className={[
                      'mt-1.5 text-[20px] font-semibold tracking-tight',
                      tone === 'danger' ? 'text-negative' : tone === 'warning' ? 'text-warn' : 'text-mist-100',
                    ].join(' ')}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* License */}
          <Card>
            <CardHeader title="License" subtitle="Entitlement for this account." icon={<Icon name="key" size={15} className="text-mist-500" />} />
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-mist-300">Plan</span>
                <Badge tone={license?.active ? 'success' : 'neutral'} dot>
                  {license?.planLabel ?? 'Free'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-mist-300">Daily pins</span>
                <span className="text-[12.5px] text-mist-100">{license?.unlimited ? 'Unlimited' : '0 (locked)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-mist-300">Remaining</span>
                <span className="text-[12.5px] text-mist-100">
                  {!license?.active ? '—' : license.lifetime ? 'Lifetime' : `${license.daysRemaining} days`}
                </span>
              </div>
              <Button variant="ghost" block icon="settings" onClick={() => navigate('/dashboard/settings')}>
                Manage license
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2.5 text-[12.5px] text-negative">
          <Icon name="alert" size={14} />
          {error}
        </div>
      )}
    </div>
  );
}
