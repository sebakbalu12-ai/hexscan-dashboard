import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState, Field, Input, Select, Skeleton, Tabs } from '../components/ui/Controls';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { api, ApiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { usePlans } from '../lib/hooks';

interface AdminLicense {
  id: number;
  key: string;
  plan: string;
  planLabel: string;
  status: string;
  note: string | null;
  createdAt: number;
  activatedAt: number | null;
  expiresAt: number | null;
  lifetime: boolean;
}

export default function Admin() {
  const { plans } = usePlans();
  const { push } = useToast();

  const [status, setStatus] = useState('all');
  const [items, setItems] = useState<AdminLicense[]>([]);
  const [overview, setOverview] = useState<{ users: number; pins: number; finished: number; cheating: number; activeLicenses: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const [plan, setPlan] = useState('monthly');
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [minting, setMinting] = useState(false);
  const [minted, setMinted] = useState<string[]>([]);
  const [revoking, setRevoking] = useState<AdminLicense | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  const load = useCallback(async (nextStatus: string) => {
    setLoading(true);
    try {
      const [licenses, stats] = await Promise.all([api.admin.licenses(nextStatus), api.admin.overview()]);
      setItems(licenses.items);
      setOverview(stats);
    } catch {
      push({ tone: 'danger', title: 'Could not load licenses' });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void load(status);
  }, [load, status]);

  const mint = async () => {
    setMinting(true);
    try {
      const result = await api.admin.mint(plan, Number(count) || 1, note.trim() || undefined);
      const keys = result.created.map((entry) => entry.key);
      setMinted(keys);
      push({ tone: 'success', title: `${keys.length} key(s) created`, description: `Plan: ${plan}` });
      void load(status);
    } catch (caught) {
      push({ tone: 'danger', title: 'Key generation failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    } finally {
      setMinting(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setRevokeBusy(true);
    try {
      await api.admin.revoke(revoking.key);
      push({ tone: 'info', title: 'Key revoked', description: `${revoking.key} can no longer be activated.` });
      setRevoking(null);
      void load(status);
    } catch (caught) {
      push({ tone: 'danger', title: 'Revoke failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    } finally {
      setRevokeBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon="key"
        title="License keys"
        description="Mint, inspect and revoke license keys for your customers."
        badge={<Badge tone="accent">Admin</Badge>}
        actions={
          <Button variant="ghost" icon="refresh" onClick={() => void load(status)}>
            Refresh
          </Button>
        }
      />

      {overview && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(
            [
              ['Users', overview.users, 'users'],
              ['Pins', overview.pins, 'pin'],
              ['Finished', overview.finished, 'check'],
              ['Cheating', overview.cheating, 'alert'],
              ['Active licenses', overview.activeLicenses, 'key'],
            ] as const
          ).map(([label, value, icon]) => (
            <div key={label} className="card p-4">
              <p className="flex items-center gap-2 label-xs">
                <Icon name={icon} size={13} className="text-mist-500" />
                {label}
              </p>
              <p className="mt-2.5 text-[24px] font-semibold leading-none tracking-tight text-mist-100">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[340px_1fr]">
        {/* Mint */}
        <Card>
          <CardHeader title="Generate keys" subtitle="Hand these to customers after payment." icon={<Icon name="plus" size={15} className="text-mist-500" />} />
          <div className="mt-5 space-y-4">
            <Field label="Plan" required>
              <Select value={plan} onChange={(event) => setPlan(event.target.value)}>
                {plans.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Amount" hint="Maximum 50 keys per batch.">
              <Input type="number" min={1} max={50} value={count} onChange={(event) => setCount(Number(event.target.value))} />
            </Field>

            <Field label="Note (optional)">
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Discord: username" maxLength={120} />
            </Field>

            <Button block icon="key" loading={minting} onClick={mint}>
              Generate
            </Button>

            {minted.length > 0 && (
              <div className="rounded-lg border border-positive/25 bg-positive/[0.06] p-3.5">
                <div className="flex items-center justify-between">
                  <p className="label-xs text-positive">New keys</p>
                  <button
                    type="button"
                    className="text-[11.5px] font-medium text-accent-soft hover:text-white"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(minted.join('\n'));
                      push({ tone: 'success', title: 'Keys copied', description: `${minted.length} key(s) copied to the clipboard.` });
                    }}
                  >
                    Copy all
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {minted.map((entry) => (
                    <li key={entry} className="font-mono text-[12px] text-mist-200">
                      {entry}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* List */}
        <Card padded={false}>
          <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-[13px] text-mist-300">{loading ? 'Loading…' : `${items.length} license(s)`}</p>
            <Tabs
              value={status}
              onChange={setStatus}
              tabs={[
                { value: 'all', label: 'All' },
                { value: 'unused', label: 'Unused' },
                { value: 'active', label: 'Active' },
                { value: 'expired', label: 'Expired' },
                { value: 'revoked', label: 'Revoked' },
              ]}
            />
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="key" title="No licenses" description="Generate a batch to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-y border-line">
                    {['Key', 'Plan', 'Status', 'Note', 'Activated', 'Expires', ''].map((header) => (
                      <th key={header} className="px-4 py-2.5 label-xs">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((entry) => (
                    <tr key={entry.id} className="border-b border-line/60 last:border-0 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[12px] text-mist-200">{entry.key}</td>
                      <td className="px-4 py-3 text-[12.5px] text-mist-300">{entry.planLabel}</td>
                      <td className="px-4 py-3">
                        <Badge
                          tone={
                            entry.status === 'active'
                              ? 'success'
                              : entry.status === 'unused'
                                ? 'accent'
                                : entry.status === 'revoked'
                                  ? 'danger'
                                  : 'neutral'
                          }
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="max-w-[160px] truncate px-4 py-3 text-[12px] text-mist-500">{entry.note || '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-mist-400">{entry.activatedAt ? formatDate(entry.activatedAt) : '—'}</td>
                      <td className="px-4 py-3 text-[12px] text-mist-400">{entry.lifetime ? 'Never' : entry.expiresAt ? formatDate(entry.expiresAt) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setRevoking(entry)}
                          disabled={entry.status === 'revoked'}
                          className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-negative/10 hover:text-negative disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Revoke ${entry.key}`}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={Boolean(revoking)}
        busy={revokeBusy}
        title="Revoke this license key?"
        description={`${revoking?.key ?? ''} will be blocked from activation. Accounts already using it lose access on the next check.`}
        confirmLabel="Revoke key"
        danger
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
      />
    </div>
  );
}
