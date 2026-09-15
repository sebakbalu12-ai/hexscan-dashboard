import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, Field, Input, ProgressBar, Skeleton } from '../components/ui/Controls';
import PlanCard from '../components/license/PlanCard';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';
import { formatDate, pluralize } from '../lib/format';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../lib/hooks';
import type { LicenseHistoryEntry } from '../lib/types';

export default function Settings() {
  const { user, license, activateLicense, signOut } = useAuth();
  const { plans } = usePlans();
  const { push } = useToast();

  const [history, setHistory] = useState<LicenseHistoryEntry[]>([]);
  const [pinsThisMonth, setPinsThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await api.license.status();
      setHistory(result.history);
      setPinsThisMonth(result.pinsThisMonth);
    } catch {
      /* the page still renders the session license on failure */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activate = async () => {
    if (!key.trim()) {
      setError('Enter a license key first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await activateLicense(key.trim());
      push({ tone: 'success', title: result.alreadyActive ? 'Key already active' : 'License activated', description: result.message });
      setKey('');
      void load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Activation failed.');
    } finally {
      setBusy(false);
    }
  };

  const active = Boolean(license?.active);
  const totalDays =
    license?.plan === 'monthly' ? 30 : license?.plan === 'quarterly' ? 90 : license?.plan === 'semiannual' ? 180 : null;
  const remainingPercent =
    license?.lifetime || !totalDays || license?.daysRemaining === null
      ? 100
      : Math.max(0, Math.min(100, ((license?.daysRemaining ?? 0) / totalDays) * 100));

  return (
    <div className="space-y-6">
      <PageHeader
        icon="settings"
        title="Settings"
        description="Manage your license, activation keys and account."
        badge={
          active ? (
            <Badge tone={license?.lifetime ? 'success' : 'accent'} dot>
              {license?.planLabel}
            </Badge>
          ) : (
            <Badge tone="warning" dot>
              Free tier
            </Badge>
          )
        }
        actions={
          <Button variant="ghost" icon="logout" onClick={() => void signOut()}>
            Sign out
          </Button>
        }
      />

      {/* License status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Current license"
            subtitle="Pin generation is unlimited on every paid plan."
            icon={<Icon name="key" size={15} className="text-mist-500" />}
            action={<Badge tone={active ? (license?.lifetime ? 'success' : 'accent') : 'warning'} dot>{active ? 'Active' : 'Inactive'}</Badge>}
          />

          {!active ? (
            <div className="mt-5">
              <div className="flex items-start gap-3 rounded-lg border border-warn/25 bg-warn/[0.07] p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
                  <Icon name="lock" size={16} />
                </span>
                <div>
                  <p className="text-[13.5px] font-medium text-mist-100">No active license</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-mist-400">
                    You can browse the dashboard and every past report, but <span className="text-mist-200">Create Pin</span> stays
                    disabled until you activate a license key.
                  </p>
                </div>
              </div>
              <Button className="mt-4" icon="plus" onClick={() => document.getElementById('activate-key')?.focus()}>
                Activate a key below
              </Button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {(
                  [
                    ['Plan', license?.planLabel ?? '—', 'spark'],
                    ['Activated', license?.activatedAt ? formatDate(license.activatedAt) : '—', 'clock'],
                    ['Expires', license?.lifetime ? 'Never (lifetime)' : license?.expiresAt ? formatDate(license.expiresAt) : '—', 'alert'],
                  ] as const
                ).map(([label, value, icon]) => (
                  <div key={label} className="rounded-lg border border-line bg-ink-900/60 p-3.5">
                    <p className="flex items-center gap-1.5 label-xs">
                      <Icon name={icon} size={12} className="text-mist-500" />
                      {label}
                    </p>
                    <p className="mt-1.5 truncate text-[13.5px] text-mist-100">{value}</p>
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-mist-400">
                    {license?.lifetime ? 'Lifetime access' : `${license?.daysRemaining} day(s) remaining`}
                  </span>
                  <span className="font-mono text-mist-300">{license?.lifetime ? '∞' : `${Math.round(remainingPercent)}%`}</span>
                </div>
                <ProgressBar className="mt-2" value={remainingPercent} tone={remainingPercent > 25 ? 'positive' : 'warning'} height={7} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/60 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="label-xs">License key</p>
                  <p className="mt-1 truncate font-mono text-[13px] text-mist-200">{license?.key ?? '—'}</p>
                </div>
                <Badge tone="success" icon={<Icon name="shield" size={11} />}>
                  Unlimited pins
                </Badge>
              </div>
            </div>
          )}
        </Card>

        {/* Activation */}
        <Card>
          <CardHeader
            title="Activate a license key"
            subtitle="Keys bind to your account; a key can only be used once."
            icon={<Icon name="check" size={15} className="text-mist-500" />}
          />
          <div className="mt-5 space-y-3">
            <Field label="License key" hint="Format: HEX-XXXXX-XXXXX-XXXXX-XXXXX">
              <Input
                id="activate-key"
                value={key}
                onChange={(event) => setKey(event.target.value.toUpperCase())}
                placeholder="HEX-XXXXX-XXXXX-XXXXX-XXXXX"
                className="font-mono tracking-wider"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2.5 text-[12.5px] text-negative">
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button block icon="key" loading={busy} onClick={activate}>
              Activate license
            </Button>

            <div className="rounded-lg border border-line bg-ink-900/50 p-3.5">
              <p className="label-xs">This month</p>
              <p className="mt-1.5 text-[13px] text-mist-200">
                {pluralize(pinsThisMonth, 'pin')} generated
                {license?.unlimited ? ' · unlimited quota' : ' · generation locked'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Plans */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-mist-100">Licenses</h2>
            <p className="text-[12.5px] text-mist-400">Every plan unlocks unlimited pin generation for the whole period.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={license?.plan === plan.id && active}
              ctaLabel={license?.plan === plan.id && active ? 'Current plan' : 'Buy license'}
              onSelect={() =>
                push({
                  tone: 'info',
                  title: `${plan.label} license`,
                  description: 'Complete the purchase to receive your key, then activate it above.',
                })
              }
            />
          ))}
        </div>
      </div>

      {/* History + account */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card padded={false}>
          <div className="p-5">
            <CardHeader title="License history" subtitle="Keys that were activated on this account." icon={<Icon name="activity" size={15} className="text-mist-500" />} />
          </div>

          {loading ? (
            <div className="space-y-2 px-5 pb-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState icon="key" title="No licenses yet" description="Activate a key and it will be listed here with its expiry date." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-y border-line">
                    {['Key', 'Plan', 'Status', 'Activated', 'Expires'].map((header) => (
                      <th key={header} className="px-5 py-2.5 label-xs">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => (
                    <tr key={entry.key} className="border-b border-line/60 last:border-0">
                      <td className="px-5 py-3 font-mono text-[12.5px] text-mist-200">{entry.key}</td>
                      <td className="px-5 py-3 text-[12.5px] text-mist-300">{entry.plan}</td>
                      <td className="px-5 py-3">
                        <Badge tone={entry.status === 'active' ? 'success' : entry.status === 'revoked' ? 'danger' : 'neutral'}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-[12px] text-mist-400">{entry.activatedAt ? formatDate(entry.activatedAt) : '—'}</td>
                      <td className="px-5 py-3 text-[12px] text-mist-400">{entry.lifetime ? 'Never' : entry.expiresAt ? formatDate(entry.expiresAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Account" subtitle="Identity tied to this dashboard." icon={<Icon name="users" size={15} className="text-mist-500" />} />
          <dl className="mt-5 space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mist-400">Username</dt>
              <dd className="truncate font-mono text-mist-200">{user?.username}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mist-400">Email</dt>
              <dd className="truncate font-mono text-mist-200">{user?.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mist-400">Member since</dt>
              <dd className="text-mist-200">{user ? formatDate(user.createdAt) : '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-mist-400">Role</dt>
              <dd>
                <Badge tone={user?.role === 'admin' ? 'accent' : 'neutral'}>{user?.role === 'admin' ? 'Administrator' : 'User'}</Badge>
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2">
            {user?.role === 'admin' && (
              <Button variant="ghost" block icon="key" onClick={() => window.location.assign('/dashboard/admin')}>
                License key generator
              </Button>
            )}
            <Button variant="danger" block icon="logout" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
