import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Badge } from '../ui/Badge';
import CopyField from './CopyField';
import { ProgressBar } from '../ui/Controls';
import { DURATIONS } from './constants';
import type { Pin } from '../../lib/types';

/**
 * “Pin Created Successfully” dialog.
 *
 * Shows the two things the operator must hand to the player: the pin code and
 * the download URL, plus the queue state of the freshly created pin.
 */
export function PinCreatedModal({
  open,
  pin,
  downloadUrl,
  onClose,
  onOpenResults,
}: {
  open: boolean;
  pin: Pin | null;
  downloadUrl: string;
  onClose: () => void;
  onOpenResults: () => void;
}) {
  if (!pin) return null;

  return (
    <Modal open={open} onClose={onClose} size="md" closeOnBackdrop={false} className="overflow-hidden">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-positive/30 bg-positive/10 text-positive">
          <Icon name="check" size={19} />
        </span>
        <div className="flex-1">
          <p className="label-xs text-positive">Ready to scan</p>
          <h2 className="mt-1 text-[19px] font-semibold tracking-tight text-mist-100">Pin Created Successfully</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">
            Share the download link with the player. The pin stays live for {DURATIONS.pinTtlHours} hours.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-mist-400 transition-colors hover:bg-white/[0.06] hover:text-mist-100"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-ink-900/70 p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-accent-soft">
            <Icon name="spark" size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium text-mist-100">{pin.game}</p>
            <p className="text-[11.5px] text-mist-500">{pin.player}</p>
          </div>
          <Badge tone="neutral" icon={<Icon name={pin.visibility === 'private' ? 'lock' : 'unlock'} size={11} />}>
            {pin.visibility === 'private' ? 'Private' : 'Public'}
          </Badge>
        </div>

        <CopyField label="Pin code" value={pin.code} mono tracking icon="pin" />

        <CopyField label="Download URL" value={downloadUrl || pin.downloadUrl} icon="link" hint="Share with player" multiline />

        <div className="rounded-lg border border-line bg-ink-900/60 p-3.5">
          <div className="flex items-center justify-between">
            <span className="label-xs">Scan status</span>
            <Badge tone="warning" dot pulse>
              Pending
            </Badge>
          </div>
          <ProgressBar className="mt-3" value={3} tone="warning" height={5} />
          <div className="mt-2 flex items-center justify-between text-[11.5px]">
            <span className="text-mist-400">Your pin is in queue and waiting to be scanned…</span>
            <span className="font-mono text-warn">0%</span>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-[12px] leading-relaxed text-mist-400">
          <Icon name="info" size={14} className="mt-0.5 shrink-0 text-mist-500" />
          This pin will be available for {DURATIONS.pinTtlHours} hours. Make sure you use it before it expires.
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Button variant="ghost" onClick={onClose} block>
          Close
        </Button>
        <Button icon="radar" onClick={onOpenResults} block>
          Open scan results
        </Button>
      </div>
    </Modal>
  );
}

export default PinCreatedModal;
