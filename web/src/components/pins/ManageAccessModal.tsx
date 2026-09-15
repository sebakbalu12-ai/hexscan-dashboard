import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Field, Input, Select } from '../ui/Controls';
import CopyField from './CopyField';
import { useToast } from '../ui/Toast';
import { api, ApiError } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { PinDetail, Share } from '../../lib/types';

/** “Manage Access” for a single pin: share by email or expose a public link. */
export function ManageAccessModal({
  open,
  pin,
  onClose,
  onChanged,
}: {
  open: boolean;
  pin: PinDetail | null;
  onClose: () => void;
  onChanged?: (shares: Share[]) => void;
}) {
  const { push } = useToast();
  const [shares, setShares] = useState<Share[]>(pin?.shares ?? []);
  const [email, setEmail] = useState('');
  const [access, setAccess] = useState<'view' | 'full'>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setShares(pin?.shares ?? []);
    setEmail('');
    setError(null);
  }, [pin, open]);

  if (!pin) return null;

  const addShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.pins.share(pin.code, email.trim(), access);
      setShares(result.shares);
      onChanged?.(result.shares);
      setEmail('');
      push({ tone: 'success', title: 'Access granted', description: `${email.trim()} can now open ${pin.code}.` });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not share this pin.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (target: string) => {
    setBusy(true);
    try {
      const result = await api.pins.unshare(pin.code, target);
      setShares(result.shares);
      onChanged?.(result.shares);
      push({ tone: 'info', title: 'Access removed', description: `${target} can no longer open this pin.` });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not remove that share.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Access"
      subtitle={`Control who can open ${pin.code}.`}
      icon="users"
      size="md"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink-900/60 p-3.5">
          <div className="flex items-center gap-2.5">
            <Icon name={pin.visibility === 'private' ? 'lock' : 'unlock'} size={15} className="text-mist-400" />
            <div>
              <p className="text-[13px] font-medium text-mist-100">{pin.visibility === 'private' ? 'Private pin' : 'Public pin'}</p>
              <p className="text-[11.5px] text-mist-500">
                {pin.visibility === 'private' ? 'Only invited emails can open it.' : 'Anyone with the link can open it.'}
              </p>
            </div>
          </div>
          <Badge tone={pin.visibility === 'private' ? 'neutral' : 'accent'}>{pin.visibility}</Badge>
        </div>

        <div>
          <p className="label-xs mb-2">Invite by email</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Field label="">
                <Input
                  type="email"
                  icon="mail"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@example.com"
                />
              </Field>
            </div>
            <Select value={access} onChange={(event) => setAccess(event.target.value as 'view' | 'full')} className="sm:w-[120px] sm:self-center">
              <option value="view">Can view</option>
              <option value="full">Full access</option>
            </Select>
            <Button icon="plus" loading={busy} onClick={addShare} className="sm:mb-0.5">
              Share
            </Button>
          </div>
          {error && (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-negative">
              <Icon name="alert" size={13} />
              {error}
            </p>
          )}
        </div>

        <div>
          <p className="label-xs mb-2">People with access ({shares.length})</p>
          {shares.length === 0 ? (
            <p className="rounded-lg border border-line bg-ink-900/50 px-3 py-3 text-[12.5px] text-mist-500">
              No one else can open this pin yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {shares.map((share) => (
                <li key={share.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink-900/50 px-3 py-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-white/[0.03] text-mist-400">
                    <Icon name="users" size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] text-mist-100">{share.email}</p>
                    <p className="text-[11px] text-mist-500">Added {formatDate(share.createdAt)}</p>
                  </div>
                  <Badge tone={share.access === 'full' ? 'accent' : 'neutral'}>{share.access === 'full' ? 'Full' : 'View'}</Badge>
                  <button
                    type="button"
                    onClick={() => remove(share.email)}
                    disabled={busy}
                    aria-label={`Remove ${share.email}`}
                    className="rounded-md p-1.5 text-mist-500 transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-40"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <CopyField label="Shareable download link" value={pin.downloadUrl} icon="link" multiline hint="Send this to the player you want to check." />
      </div>
    </Modal>
  );
}

export default ManageAccessModal;
