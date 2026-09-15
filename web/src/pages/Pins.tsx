import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { Menu, Input, Select, Tabs, Skeleton } from '../components/ui/Controls';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import PinsStatsRow from '../components/pins/PinsStatsRow';
import PinsTable from '../components/pins/PinsTable';
import CreatePinModal from '../components/pins/CreatePinModal';
import PinCreatedModal from '../components/pins/PinCreatedModal';
import EditPinModal, { type PinEditPayload } from '../components/pins/EditPinModal';
import ManageAccessModal from '../components/pins/ManageAccessModal';
import { STATUS_FILTERS } from '../components/pins/constants';
import { api, ApiError } from '../lib/api';
import { useDebounced, usePlans } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import { useUpgrade } from '../context/UpgradeContext';
import type { Pin, PinDetail, PinListResponse, Stats } from '../lib/types';

const PER_PAGE_OPTIONS = [10, 25, 50];

export default function Pins() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { push } = useToast();
  const { canCreatePin } = useAuth();
  const { open: openUpgrade } = useUpgrade();
  const { simulation } = usePlans();

  const tab = params.get('shared') === '1' ? 'shared' : 'mine';
  const status = params.get('status') ?? 'all';
  const game = params.get('game') ?? 'all';
  const query = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const perPage = PER_PAGE_OPTIONS.includes(Number(params.get('perPage'))) ? Number(params.get('perPage')) : 10;

  const [search, setSearch] = useState(query);
  const debouncedSearch = useDebounced(search, 350);

  const [data, setData] = useState<PinListResponse | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [created, setCreated] = useState<{ pin: Pin; url: string } | null>(null);

  const [editing, setEditing] = useState<Pin | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [accessPin, setAccessPin] = useState<PinDetail | null>(null);
  const [deleting, setDeleting] = useState<Pin | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [games, setGames] = useState<string[]>([]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  /* ----------------------------- data loading ---------------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.pins.list({ status, game, q: query, page, perPage, shared: tab === 'shared' });
      setData(result);
      setGames(result.games);
    } catch {
      push({ tone: 'danger', title: 'Could not load pins', description: 'Check the API connection and try again.' });
    } finally {
      setLoading(false);
    }
  }, [status, game, query, page, perPage, tab, push]);

  const loadStats = useCallback(async () => {
    try {
      const overview = await api.stats.overview();
      setStats(overview.stats);
    } catch {
      /* the stats row is decorative — a failure must not break the page */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // keep the URL in sync with the debounced search box
  useEffect(() => {
    if (debouncedSearch === query) return;
    updateParams({ q: debouncedSearch || null, page: null });
  }, [debouncedSearch, query, updateParams]);

  // deep link: /dashboard/pins?create=1
  useEffect(() => {
    if (params.get('create') !== '1') return;
    updateParams({ create: null });
    if (canCreatePin) setCreateOpen(true);
    else openUpgrade('Creating scan pins requires an active license. Choose a plan below to unlock unlimited pins.');
  }, [params, updateParams, canCreatePin, openUpgrade]);

  /* ------------------------------- mutations ----------------------------- */

  const createPin = async (payload: { name?: string; player: string; game: string; visibility: 'private' | 'public' }) => {
    setCreateBusy(true);
    try {
      const result = await api.pins.create(payload);
      setCreateOpen(false);
      setCreated({ pin: result.pin, url: result.downloadUrl });
      void load();
      void loadStats();
      push({ tone: 'success', title: 'Pin created', description: `Your pin ${result.pin.code} has been created successfully.` });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 402) {
        setCreateOpen(false);
        openUpgrade(caught.message);
      } else {
        push({
          tone: 'danger',
          title: 'Pin creation failed',
          description: caught instanceof ApiError ? caught.message : 'Unexpected error.',
        });
      }
    } finally {
      setCreateBusy(false);
    }
  };

  const saveEdit = async (payload: PinEditPayload) => {
    if (!editing) return;
    setEditBusy(true);
    try {
      await api.pins.update(editing.code, payload);
      setEditing(null);
      void load();
      push({ tone: 'success', title: 'Pin updated', description: `${editing.code} has been saved.` });
    } catch (caught) {
      push({ tone: 'danger', title: 'Update failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    } finally {
      setEditBusy(false);
    }
  };

  const openAccess = async (pin: Pin) => {
    try {
      const detail = await api.pins.get(pin.code);
      setAccessPin(detail.pin);
    } catch {
      push({ tone: 'danger', title: 'Could not open access settings' });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await api.pins.remove(deleting.code);
      push({ tone: 'info', title: 'Pin deleted', description: `${deleting.code} and its report were removed.` });
      setDeleting(null);
      void load();
      void loadStats();
    } catch (caught) {
      push({ tone: 'danger', title: 'Delete failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    } finally {
      setDeleteBusy(false);
    }
  };

  const simulate = async (pin: Pin) => {
    try {
      const result = await api.pins.simulate(pin.code);
      void load();
      void loadStats();
      push({
        tone: 'info',
        title: 'Collector simulated',
        description:
          result.step === 'started'
            ? `${pin.code} is now scanning.`
            : result.step === 'finished'
              ? `${pin.code} finished with verdict “${result.pin.verdict}”.`
              : `${pin.code} is already finished.`,
      });
    } catch (caught) {
      push({ tone: 'danger', title: 'Simulation unavailable', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    }
  };

  const start = data && data.total > 0 ? (data.page - 1) * data.perPage + 1 : 0;
  const end = data && data.total > 0 ? Math.min(data.total, start + data.items.length - 1) : 0;

  const filterSummary = useMemo(
    () => [status !== 'all' ? STATUS_FILTERS.find((entry) => entry.value === status)?.label : null, game !== 'all' ? game : null, query ? `“${query}”` : null].filter(Boolean),
    [status, game, query],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon="pin"
        title="My Pins"
        description="Manage, track and analyze your scan pins and their results."
        actions={
          <>
            <Button variant="ghost" icon="info" onClick={() => navigate('/dashboard/support')}>
              Learn more
            </Button>
            <Button
              icon={canCreatePin ? 'plus' : 'lock'}
              variant={canCreatePin ? 'primary' : 'ghost'}
              onClick={() => (canCreatePin ? setCreateOpen(true) : openUpgrade())}
            >
              Create Pin
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={(value) => updateParams({ shared: value === 'shared' ? '1' : null, page: null })}
        tabs={[
          { value: 'mine', label: 'My Pins', count: tab === 'mine' ? data?.total : undefined },
          { value: 'shared', label: 'Shared with Me' },
        ]}
      />

      {stats ? <PinsStatsRow stats={stats} onShowPending={() => updateParams({ status: 'pending', page: null })} /> : <Skeleton className="h-[132px] w-full" />}

      <Card padded={false}>
        {/* toolbar */}
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1 lg:max-w-[320px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
              <Icon name="search" size={15} />
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by PIN or player…"
              className="input h-9 pl-9 text-[12.5px]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Select value={status} onChange={(event) => updateParams({ status: event.target.value === 'all' ? null : event.target.value, page: null })} className="h-9">
              {STATUS_FILTERS.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </Select>

            <Select value={game} onChange={(event) => updateParams({ game: event.target.value === 'all' ? null : event.target.value, page: null })} className="h-9">
              <option value="all">All Games</option>
              {games.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>

            <Menu
              width={220}
              items={[
                { label: 'Filter by game…', icon: 'filter', onSelect: () => undefined },
                { label: 'Pending only', icon: 'clock', onSelect: () => updateParams({ status: 'pending', page: null }) },
                { label: 'Finished only', icon: 'check', onSelect: () => updateParams({ status: 'finished', page: null }) },
                { label: 'Expired only', icon: 'alert', onSelect: () => updateParams({ status: 'expired', page: null }) },
                {
                  label: 'Reset filters',
                  icon: 'refresh',
                  separator: true,
                  onSelect: () => {
                    setSearch('');
                    updateParams({ status: null, game: null, q: null, page: null });
                  },
                },
              ]}
              trigger={({ toggle }) => (
                <button type="button" onClick={toggle} className="btn btn-ghost h-9">
                  <Icon name="filter" size={14} />
                  More
                </button>
              )}
            />
          </div>
        </div>

        {filterSummary.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            <span className="label-xs">Filters</span>
            {filterSummary.map((entry) => (
              <span key={String(entry)} className="rounded border border-line bg-white/[0.03] px-2 py-0.5 text-[11.5px] text-mist-300">
                {entry}
              </span>
            ))}
            <button
              type="button"
              onClick={() => {
                setSearch('');
                updateParams({ status: null, game: null, q: null, page: null });
              }}
              className="ml-1 text-[11.5px] font-medium text-accent-soft hover:text-white"
            >
              Clear
            </button>
          </div>
        )}

        <PinsTable
          pins={data?.items ?? []}
          loading={loading}
          onEdit={setEditing}
          onManageAccess={(pin) => void openAccess(pin)}
          onDelete={setDeleting}
          onSimulate={simulation ? simulate : undefined}
          canEditPin={() => tab === 'mine'}
        />

        {/* pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-line p-4 sm:flex-row">
          <p className="text-[12px] text-mist-500">
            {!data ? 'Loading…' : data.total === 0 ? 'No results' : `${start}-${end} of ${data.total} results`}
          </p>

          <div className="flex items-center gap-2">
            <Select
              value={String(perPage)}
              onChange={(event) => updateParams({ perPage: event.target.value, page: null })}
              className="h-8 py-0 text-[12px]"
            >
              {PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} / page
                </option>
              ))}
            </Select>

            <Button
              variant="ghost"
              size="sm"
              icon="chevronLeft"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Prev
            </Button>
            <span className="px-1 font-mono text-[12px] text-mist-400">
              {data?.page ?? 1} / {data?.pages ?? 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              iconRight="chevronRight"
              disabled={!data || page >= data.pages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      <CreatePinModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createPin}
        games={games.length ? games : ['FiveM', 'Minecraft Java', 'Rust', 'CS2', 'GTA V', 'Roblox', 'Valorant', 'Ark']}
        busy={createBusy}
        defaultGame={game !== 'all' ? game : undefined}
      />

      <PinCreatedModal
        open={Boolean(created)}
        pin={created?.pin ?? null}
        downloadUrl={created?.url ?? ''}
        onClose={() => setCreated(null)}
        onOpenResults={() => {
          const code = created?.pin.code;
          setCreated(null);
          if (code) navigate(`/dashboard/pins/${code}`);
        }}
      />

      <EditPinModal
        open={Boolean(editing)}
        pin={editing}
        games={games}
        busy={editBusy}
        onClose={() => setEditing(null)}
        onSave={saveEdit}
      />

      <ManageAccessModal open={Boolean(accessPin)} pin={accessPin} onClose={() => setAccessPin(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        busy={deleteBusy}
        title={`Delete ${deleting?.code ?? 'pin'}?`}
        description="The scan report and any collected PC information will be deleted as well."
        confirmLabel="Delete pin"
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
