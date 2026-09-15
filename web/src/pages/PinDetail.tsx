import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Card, { CardHeader } from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Badge, StatusBadge, VerdictBadge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Controls';
import { useToast } from '../components/ui/Toast';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CopyField from '../components/pins/CopyField';
import PinActionsMenu from '../components/pins/PinActionsMenu';
import EditPinModal, { type PinEditPayload } from '../components/pins/EditPinModal';
import ManageAccessModal from '../components/pins/ManageAccessModal';
import WaitingScreen from '../components/scan/WaitingScreen';
import ScanResults, { VerdictHero } from '../components/scan/ScanResults';
import { api, ApiError } from '../lib/api';
import { usePlans, usePolling } from '../lib/hooks';
import { formatDuration, relativeTime } from '../lib/format';
import { useUpgrade } from '../context/UpgradeContext';
import type { PinDetail as PinDetailType } from '../lib/types';

const GAMES = ['FiveM', 'Minecraft Java', 'Rust', 'CS2', 'GTA V', 'Roblox', 'Valorant', 'Ark'];

export default function PinDetail() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const { open: openUpgrade } = useUpgrade();
  const { simulation } = usePlans();

  const [pin, setPin] = useState<PinDetailType | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const result = await api.pins.get(code);
        setPin(result.pin);
        setCanEdit(result.canEdit);
        setNotFound(false);
      } catch (caught) {
        if (caught instanceof ApiError && (caught.status === 404 || caught.status === 403)) setNotFound(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [code],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const waiting = pin?.status === 'pending' || pin?.status === 'running';
  usePolling(() => void load(true), 6000, Boolean(waiting));

  const simulate = async () => {
    try {
      const result = await api.pins.simulate(code);
      setPin(result.pin);
      if (result.step === 'finished') {
        push({ tone: 'success', title: 'Report ready', description: `${code} finished with verdict “${result.pin.verdict}”.` });
      } else {
        push({ tone: 'info', title: 'Collector connected', description: `${code} is now scanning…` });
      }
    } catch (caught) {
      push({ tone: 'danger', title: 'Simulation unavailable', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    }
  };

  const saveEdit = async (payload: PinEditPayload) => {
    setEditBusy(true);
    try {
      const result = await api.pins.update(code, payload);
      setPin(result.pin);
      setEditOpen(false);
      push({ tone: 'success', title: 'Pin updated', description: `${code} has been saved.` });
    } catch (caught) {
      push({ tone: 'danger', title: 'Update failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
    } finally {
      setEditBusy(false);
    }
  };

  const confirmDelete = async () => {
    setDeleteBusy(true);
    try {
      await api.pins.remove(code);
      push({ tone: 'info', title: 'Pin deleted', description: `${code} was removed.` });
      navigate('/dashboard/pins');
    } catch (caught) {
      push({ tone: 'danger', title: 'Delete failed', description: caught instanceof ApiError ? caught.message : 'Unexpected error.' });
      setDeleteBusy(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[220px] w-full" />
        <Skeleton className="h-[320px] w-full" />
      </div>
    );
  }

  if (notFound || !pin) {
    return (
      <Card className="py-16 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-mist-400">
          <Icon name="search" size={21} />
        </span>
        <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-mist-100">Pin not found</h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-mist-400">
          The pin {code} does not exist or you do not have access to it.
        </p>
        <Link to="/dashboard/pins" className="btn btn-ghost mt-6">
          <Icon name="chevronLeft" size={15} />
          Back to pins
        </Link>
      </Card>
    );
  }

  const finished = pin.status === 'finished';

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card padded={false}>
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="flex items-center gap-2.5 text-[26px] font-semibold tracking-tight text-mist-100">
                  <Icon name="radar" size={22} className="text-accent-soft" />
                  Scan Results
                </h1>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-mist-400">
                  Detailed forensic breakdown and logic analysis of the requested execution context.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" icon="refresh" loading={refreshing} onClick={() => void load(true)}>
                  Refresh
                </Button>
                {canEdit && (
                  <PinActionsMenu
                    pin={pin}
                    actions={[
                      { label: 'Edit', icon: 'pencil', onSelect: () => setEditOpen(true) },
                      { label: 'Manage Access', icon: 'users', onSelect: () => setAccessOpen(true) },
                      {
                        label: 'Simulate collector',
                        icon: 'zap',
                        onSelect: simulation && !finished ? simulate : undefined,
                      },
                      {
                        label: 'Delete',
                        icon: 'trash',
                        tone: 'danger',
                        onSelect: () => setDeleteOpen(true),
                      },
                      {
                        label: 'Copy Pin',
                        icon: 'copy',
                        onSelect: () => {
                          void navigator.clipboard?.writeText(pin.code);
                        },
                      },
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <CopyField label="Identity pin" value={pin.code} mono tracking icon="pin" />
              <div>
                <p className="label-xs mb-2">Scan duration</p>
                <div className="flex h-[46px] items-center gap-3 rounded-lg border border-line bg-ink-900 px-3">
                  <Icon name="clock" size={15} className="text-mist-500" />
                  <span className="font-mono text-[13.5px] text-mist-100">
                    {finished ? formatDuration(pin.durationMs) : pin.status === 'running' ? 'scanning…' : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge tone="neutral" icon={<Icon name="spark" size={11} />}>
                Game: {pin.game}
              </Badge>
              <Badge tone="neutral" icon={<Icon name="cpu" size={11} />}>
                Run in: {pin.instance || 'No'}
              </Badge>
              <Badge tone="neutral" icon={<Icon name="spark" size={11} />}>
                AI: not supported
              </Badge>
              <Badge tone={pin.visibility === 'private' ? 'neutral' : 'accent'} icon={<Icon name={pin.visibility === 'private' ? 'lock' : 'unlock'} size={11} />}>
                {pin.visibility}
              </Badge>
              {finished ? <VerdictBadge verdict={pin.verdict} /> : <StatusBadge status={pin.status} />}
              <span className="text-[11.5px] text-mist-500">Created {relativeTime(pin.createdAt)}</span>
            </div>

            {pin.name && <p className="mt-3 text-[12.5px] text-mist-500">Pin name: {pin.name}</p>}
          </div>

          {finished && <VerdictHero pin={pin} />}
        </div>
      </Card>

      {/* Body */}
      {pin.status === 'expired' ? (
        <Card className="py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-negative/25 bg-negative/10 text-negative">
            <Icon name="alert" size={21} />
          </span>
          <h2 className="mt-4 text-[19px] font-semibold tracking-tight text-mist-100">This pin expired</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-mist-400">
            The collector never connected within 24 hours. Generate a fresh pin and send the new download link to the player.
          </p>
          <Button
            className="mt-6"
            icon="plus"
            onClick={() => {
              if (canEdit) navigate('/dashboard/pins?create=1');
              else openUpgrade();
            }}
          >
            Create a new pin
          </Button>
        </Card>
      ) : finished ? (
        <ScanResults pin={pin} />
      ) : (
        <WaitingScreen
          pin={pin}
          simulation={simulation}
          onSimulate={simulation && canEdit ? simulate : undefined}
          onRefresh={() => void load(true)}
          refreshing={refreshing}
        />
      )}

      {/* Meta */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Timeline" subtitle="Lifecycle of this pin." icon={<Icon name="activity" size={15} className="text-mist-500" />} />
          <ol className="mt-5 space-y-4">
            {pin.timeline.map((entry) => (
              <li key={entry.label} className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_rgba(37,99,235,0.15)]" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-mist-200">{entry.label}</span>
                    <span className="font-mono text-[11.5px] text-mist-500">{relativeTime(entry.at)}</span>
                  </div>
                  <p className="text-[11.5px] text-mist-500">{new Date(entry.at).toLocaleString('en-GB')}</p>
                </div>
              </li>
            ))}
          </ol>

          {pin.notes && (
            <div className="mt-5 rounded-lg border border-line bg-ink-900/60 p-3.5">
              <p className="label-xs">Notes</p>
              <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-relaxed text-mist-300">{pin.notes}</p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Sharing"
            subtitle={`${pin.shares.length} teammate${pin.shares.length === 1 ? '' : 's'} can open this pin.`}
            icon={<Icon name="users" size={15} className="text-mist-500" />}
            action={
              canEdit ? (
                <Button variant="ghost" size="sm" icon="plus" onClick={() => setAccessOpen(true)}>
                  Manage
                </Button>
              ) : undefined
            }
          />
          <div className="mt-5 space-y-3">
            <CopyField label="Download URL" value={pin.downloadUrl} icon="link" multiline hint="Send this link to the player you want to check." />
            {pin.detectionsCount > 0 && (
              <div className="flex items-center gap-2.5 rounded-lg border border-line bg-ink-900/50 px-3.5 py-3">
                <Icon name="cpu" size={15} className="text-mist-400" />
                <span className="text-[12.5px] text-mist-300">{pin.detectionsCount} recorded detections</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <EditPinModal
        open={editOpen}
        pin={pin}
        games={GAMES}
        busy={editBusy}
        onClose={() => setEditOpen(false)}
        onSave={saveEdit}
      />

      <ManageAccessModal
        open={accessOpen}
        pin={pin}
        onClose={() => setAccessOpen(false)}
        onChanged={(shares) => setPin((current) => (current ? { ...current, shares } : current))}
      />

      <ConfirmDialog
        open={deleteOpen}
        busy={deleteBusy}
        title={`Delete ${pin.code}?`}
        description="The scan report and any collected PC information will be deleted as well."
        confirmLabel="Delete pin"
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
