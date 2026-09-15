import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { Field, Input, Select, Toggle } from '../ui/Controls';
import { DURATIONS } from './constants';

/**
 * Create Pin dialog.
 *
 * Layout follows the reference: PIN NAME input, the game + player selectors,
 * the Private Pin switch and the two "Locked" add-on cards.
 */
export function CreatePinModal({
  open,
  onClose,
  onCreate,
  games,
  busy = false,
  defaultGame,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name?: string; player: string; game: string; visibility: 'private' | 'public' }) => void;
  games: string[];
  busy?: boolean;
  defaultGame?: string;
}) {
  const [name, setName] = useState('');
  const [player, setPlayer] = useState('');
  const [game, setGame] = useState(defaultGame || games[0] || 'FiveM');
  const [isPrivate, setIsPrivate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setName('');
      setPlayer('');
      setError(null);
    } else if (defaultGame) {
      setGame(defaultGame);
    }
  }, [open, defaultGame]);

  const submit = () => {
    if (player.trim().length < 2) {
      setError('Enter the player name (at least 2 characters).');
      return;
    }
    setError(null);
    onCreate({ name: name.trim() || undefined, player: player.trim(), game, visibility: isPrivate ? 'private' : 'public' });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Pin"
      subtitle="Generate a scan request. The player receives a code and a download link."
      icon="pin"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button icon="plus" loading={busy} onClick={submit}>
            Create Pin
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Pin name (optional)">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name to identify the pin"
            maxLength={60}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Player" required>
            <Input value={player} onChange={(event) => setPlayer(event.target.value)} placeholder="Player name" maxLength={60} />
          </Field>
          <Field label="Game" required>
            <Select value={game} onChange={(event) => setGame(event.target.value)}>
              {games.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div>
          <p className="label-xs mb-2">Options</p>
          <div
            className={[
              'flex items-start gap-3 rounded-lg border p-3.5 transition-colors',
              isPrivate ? 'border-accent/35 bg-accent/[0.06]' : 'border-line bg-ink-900/60',
            ].join(' ')}
          >
            <span
              className={[
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                isPrivate ? 'border-accent/30 bg-accent/15 text-accent-soft' : 'border-line bg-white/[0.03] text-mist-400',
              ].join(' ')}
            >
              <Icon name={isPrivate ? 'lock' : 'unlock'} size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-mist-100">Private Pin</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">
                Only you and people you share with can open this pin.
              </p>
            </div>
            <Toggle checked={isPrivate} onChange={setIsPrivate} label="Private pin" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {['RUIN', 'ÆGIR'].map((mod) => (
              <div
                key={mod}
                title="Available in the Custom GUI package"
                className="flex items-center gap-3 rounded-lg border border-line bg-ink-900/40 p-3 opacity-60"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.02] text-mist-500">
                  <Icon name="lock" size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold tracking-wide text-mist-300">{mod}</p>
                  <p className="text-[11.5px] text-mist-500">Locked</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2 text-[12.5px] text-negative">
            <Icon name="alert" size={14} />
            {error}
          </div>
        )}

        <div className="flex items-center gap-2 rounded-lg border border-line bg-ink-900/60 px-3 py-2.5 text-[12px] text-mist-400">
          <Icon name="clock" size={14} className="text-mist-500" />
          The pin stays live for {DURATIONS.pinTtlHours} hours. The scan starts as soon as the player runs the tool.
        </div>
      </div>
    </Modal>
  );
}

export default CreatePinModal;
