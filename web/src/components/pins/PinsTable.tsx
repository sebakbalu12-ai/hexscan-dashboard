import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { VerdictBadge, StatusBadge } from '../ui/Badge';
import { EmptyState, ProgressBar, Skeleton } from '../ui/Controls';
import { useToast } from '../ui/Toast';
import { relativeTime } from '../../lib/format';
import PinActionsMenu from './PinActionsMenu';
import type { Pin } from '../../lib/types';

const HEADERS = ['Pin', 'Players', 'Game', 'Status', 'Result', 'Visibility', ''];

function CopyPinButton({ code }: { code: string }) {
  const { push } = useToast();
  return (
    <button
      type="button"
      title="Copy pin code"
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(code);
          push({ tone: 'success', title: 'Pin copied', description: `${code} is on your clipboard.` });
        } catch {
          push({ tone: 'warning', title: 'Clipboard unavailable', description: 'Select the code and copy it manually.' });
        }
      }}
      className="rounded border border-transparent p-1 text-mist-500 transition-colors hover:border-line hover:bg-white/[0.05] hover:text-mist-200"
    >
      <Icon name="copy" size={12} />
    </button>
  );
}

/** Builds the row menu, omitting every action the viewer may not perform. */
function rowActions(
  pin: Pin,
  options: {
    editable: boolean;
    onEdit?: (pin: Pin) => void;
    onManageAccess?: (pin: Pin) => void;
    onDelete?: (pin: Pin) => void;
    onSimulate?: (pin: Pin) => void;
    navigate: (to: string) => void;
  },
) {
  const { editable, onEdit, onManageAccess, onDelete, onSimulate, navigate } = options;
  const actions: { label: string; icon: IconName; tone?: 'danger'; onSelect?: () => void }[] = [
    { label: 'View Results', icon: 'eye', onSelect: () => navigate(`/dashboard/pins/${pin.code}`) },
  ];

  if (editable && onEdit) actions.push({ label: 'Edit', icon: 'pencil', onSelect: () => onEdit(pin) });
  if (editable && onManageAccess) actions.push({ label: 'Manage Access', icon: 'users', onSelect: () => onManageAccess(pin) });
  if (onSimulate && pin.status !== 'finished' && pin.status !== 'expired') {
    actions.push({ label: 'Simulate collector', icon: 'zap', onSelect: () => onSimulate(pin) });
  }
  if (editable && onDelete) actions.push({ label: 'Delete', icon: 'trash', tone: 'danger', onSelect: () => onDelete(pin) });

  actions.push({
    label: 'Copy Pin',
    icon: 'copy',
    onSelect: () => {
      void navigator.clipboard?.writeText(pin.code);
    },
  });

  return actions;
}

export function PinsTable({
  pins,
  loading,
  onEdit,
  onManageAccess,
  onDelete,
  onSimulate,
  canEditPin = () => true,
  emptyState,
}: {
  pins: Pin[];
  loading?: boolean;
  onEdit?: (pin: Pin) => void;
  onManageAccess?: (pin: Pin) => void;
  onDelete?: (pin: Pin) => void;
  onSimulate?: (pin: Pin) => void;
  canEditPin?: (pin: Pin) => boolean;
  emptyState?: ReactNode;
}) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!pins.length) {
    return <>{emptyState ?? <EmptyState icon="pin" title="No results found" description="Adjust the filters or create a new pin." />}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {HEADERS.map((header, index) => (
              <th key={`${header}-${index}`} className="px-4 py-3 label-xs font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pins.map((pin) => {
            const editable = canEditPin(pin);
            return (
              <tr
                key={pin.id}
                onClick={() => navigate(`/dashboard/pins/${pin.code}`)}
                className="group cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-white/[0.025]"
              >
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[13px] text-mist-100">{pin.code}</span>
                    <CopyPinButton code={pin.code} />
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-mist-500">
                    <Icon name="clock" size={11} />
                    {relativeTime(pin.createdAt)}
                  </p>
                </td>

                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-white/[0.03] text-[10px] font-semibold text-mist-300">
                      {pin.player.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="max-w-[150px] truncate text-[13px] text-mist-200">{pin.player}</span>
                  </div>
                  {pin.ownerUsername && <p className="mt-0.5 text-[11.5px] text-mist-500">by {pin.ownerUsername}</p>}
                </td>

                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-mist-200">{pin.game}</span>
                  {pin.name && <p className="mt-0.5 max-w-[170px] truncate text-[11.5px] text-mist-500">{pin.name}</p>}
                </td>

                <td className="px-4 py-3.5">
                  <StatusBadge status={pin.status} />
                  {(pin.status === 'pending' || pin.status === 'running') && (
                    <ProgressBar className="mt-2 w-[110px]" value={pin.status === 'running' ? 45 : 6} tone={pin.status === 'running' ? 'accent' : 'warning'} height={4} />
                  )}
                  {pin.status === 'expired' && <p className="mt-1 text-[11.5px] text-warn">Pin expired</p>}
                </td>

                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <VerdictBadge verdict={pin.verdict} />
                    {pin.riskScore !== null && <span className="font-mono text-[11.5px] text-mist-500">{pin.riskScore}%</span>}
                  </div>
                  {pin.detectionsCount > 0 && (
                    <p className="mt-1 text-[11.5px] text-mist-500">
                      {pin.detectionsCount} detection{pin.detectionsCount === 1 ? '' : 's'}
                    </p>
                  )}
                </td>

                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-mist-300">
                    <Icon name={pin.visibility === 'private' ? 'lock' : 'unlock'} size={13} className="text-mist-500" />
                    {pin.visibility === 'private' ? 'Private' : 'Public'}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-right">
                  <div className="flex justify-end">
                    <PinActionsMenu pin={pin} actions={rowActions(pin, { editable, onEdit, onManageAccess, onDelete, onSimulate, navigate })} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default PinsTable;
