import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Toggle } from '../ui/Controls';
import type { Pin } from '../../lib/types';

export interface PinEditPayload {
  name: string | null;
  player: string;
  game: string;
  visibility: 'private' | 'public';
  notes: string | null;
}

export function EditPinModal({
  open,
  pin,
  games,
  busy = false,
  onClose,
  onSave,
}: {
  open: boolean;
  pin: Pin | null;
  games: string[];
  busy?: boolean;
  onClose: () => void;
  onSave: (payload: PinEditPayload) => void;
}) {
  const [name, setName] = useState('');
  const [player, setPlayer] = useState('');
  const [game, setGame] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!pin) return;
    setName(pin.name ?? '');
    setPlayer(pin.player);
    setGame(pin.game);
    setIsPrivate(pin.visibility === 'private');
    setNotes(pin.notes ?? '');
  }, [pin]);

  if (!pin) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${pin.code}`}
      subtitle="Change how this pin is labelled and who can open it."
      icon="pencil"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            icon="check"
            loading={busy}
            onClick={() =>
              onSave({ name: name.trim() || null, player: player.trim(), game, visibility: isPrivate ? 'private' : 'public', notes: notes.trim() || null })
            }
          >
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Pin name (optional)">
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name to identify the pin" maxLength={80} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Player" required>
            <Input value={player} onChange={(event) => setPlayer(event.target.value)} maxLength={80} />
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

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Anything the checker should know…"
            className="input resize-y"
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/60 p-3.5">
          <div>
            <p className="text-[13px] font-medium text-mist-100">Private pin</p>
            <p className="mt-0.5 text-[12px] text-mist-400">Only you and people you share with can open this pin.</p>
          </div>
          <Toggle checked={isPrivate} onChange={setIsPrivate} label="Private pin" />
        </div>
      </div>
    </Modal>
  );
}

export default EditPinModal;
