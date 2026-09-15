import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { ProgressBar } from '../ui/Controls';
import { useToast } from '../ui/Toast';
import { formatCountdown } from '../../lib/format';
import { useNow } from '../../lib/hooks';
import type { Pin } from '../../lib/types';

/**
 * Shown while the pin is `pending` / `running`: the collector has not reported
 * back yet. Mirrors the reference “Waiting for the tool to connect” screen.
 */
export function WaitingScreen({
  pin,
  simulation = false,
  onSimulate,
  onRefresh,
  refreshing = false,
}: {
  pin: Pin;
  simulation?: boolean;
  onSimulate?: () => void | Promise<void>;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const { push } = useToast();
  const now = useNow();
  const running = pin.status === 'running';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pin.downloadUrl);
      push({ tone: 'success', title: 'Download link copied', description: 'Send it to the player and ask them to run it.' });
    } catch {
      push({ tone: 'warning', title: 'Clipboard unavailable', description: 'Select the link and copy it manually.' });
    }
  };

  return (
    <div className="card p-8 sm:p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-warn/30 bg-warn/10 text-warn">
          <Icon name="clock" size={24} />
          {running && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-soft rounded-full bg-accent shadow-[0_0_10px_rgba(37,99,235,0.9)]" />}
        </span>

        <h2 className="mt-5 text-[21px] font-semibold tracking-tight text-mist-100">
          Waiting for the tool to connect to HexScan&apos;s servers
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mist-400">
          This will happen as soon as the suspect downloads and runs the tool.
        </p>

        <div className="mt-6 w-full max-w-md">
          <ProgressBar value={running ? 45 : 6} tone={running ? 'accent' : 'warning'} height={7} />
          <div className="mt-2.5 flex items-center justify-between text-[11.5px]">
            <span className="text-mist-500">{running ? 'Collector connected — collecting evidence…' : 'Pin in queue'}</span>
            <span className="font-mono text-mist-400">{running ? '45%' : '0%'}</span>
          </div>
        </div>

        <p className="mt-6 text-[12.5px] text-mist-500">
          If you haven&apos;t done so yet, send the download link to the suspect and tell them to run it.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button variant="ghost" icon="copy" onClick={copyLink}>
            Copy download link
          </Button>
          {onRefresh && (
            <Button variant="ghost" icon="refresh" loading={refreshing} onClick={onRefresh}>
              Check again
            </Button>
          )}
          {simulation && onSimulate && (
            <Button variant="subtle" icon="zap" onClick={onSimulate}>
              {running ? 'Simulate report' : 'Simulate collector'}
            </Button>
          )}
        </div>

        <div className="mt-8 flex items-center gap-3 text-[11.5px] text-mist-500">
          <span className="flex items-center gap-1.5">
            <Icon name="clock" size={12} />
            Expires in {formatCountdown(pin.expiresAt, now)}
          </span>
          <span className="h-1 w-1 rounded-full bg-mist-600" />
          <span className="font-mono">{pin.code}</span>
        </div>
      </div>
    </div>
  );
}

export default WaitingScreen;
