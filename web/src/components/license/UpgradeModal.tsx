import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Field, Input } from '../ui/Controls';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../lib/hooks';
import { ApiError } from '../../lib/api';
import PlanCard from './PlanCard';

/**
 * Licensing modal.
 *
 * The free tier can create zero pins, so every gated action funnels here. The
 * modal explains why it opened, lists the 1 / 3 / 6 month and lifetime plans and
 * doubles as an activation form for a key bought elsewhere.
 */
export function UpgradeModal({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: string | null }) {
  const { plans } = usePlans();
  const { license, activateLicense } = useAuth();
  const { push } = useToast();

  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setKey('');
      setError(null);
      setChosen(null);
    }
  }, [open]);

  const activate = async () => {
    if (!key.trim()) {
      setError('Enter the license key you received after purchase.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await activateLicense(key.trim());
      push({
        tone: 'success',
        title: result.alreadyActive ? 'License already active' : 'License activated',
        description: result.message,
      });
      onClose();
    } catch (caught) {
      const message =
        caught instanceof ApiError ? caught.message : 'Activation failed. Check the key and try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const isFree = !license?.active;

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon="key"
      iconTone="accent"
      size="lg"
      title={isFree ? 'Unlock unlimited pins' : 'License'}
      subtitle={
        reason ||
        (isFree
          ? 'Dashboard access is free, but generating scan pins requires an active license.'
          : 'Your license is active — you have unlimited pin generation.')
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Close
          </Button>
          <Button icon="key" loading={busy} onClick={activate}>
            Activate key
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {license?.active ? (
          <div className="flex items-center gap-3 rounded-lg border border-positive/25 bg-positive/[0.07] p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-positive/30 bg-positive/10 text-positive">
              <Icon name="check" size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-mist-100">{license.planLabel} license active</p>
              <p className="text-[12px] text-mist-400">
                {license.lifetime
                  ? 'Lifetime access — unlimited pins, no renewal.'
                  : `${license.daysRemaining} day(s) remaining · unlimited pin generation.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-lg border border-warn/25 bg-warn/[0.07] p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-warn/30 bg-warn/10 text-warn">
              <Icon name="lock" size={16} />
            </span>
            <div>
              <p className="text-[13.5px] font-medium text-mist-100">Create Pin is disabled on the free tier</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-mist-400">
                Browse the dashboard, the demo report and your past results for free. Activate a license below to generate
                unlimited pins.
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="label-xs mb-3">Available licenses</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                compact
                selected={chosen === plan.id || license?.plan === plan.id}
                onSelect={() => {
                  setChosen(plan.id);
                  push({
                    tone: 'info',
                    title: `${plan.label} selected`,
                    description: 'Complete the purchase to receive a key, then activate it below.',
                  });
                }}
                ctaLabel={license?.plan === plan.id && license.active ? 'Current plan' : 'Buy'}
              />
            ))}
          </div>
          <p className="mt-3 text-[12px] text-mist-500">
            Keys are delivered as <span className="font-mono text-mist-400">HEX-XXXXX-XXXXX-XXXXX-XXXXX</span> and bind to
            your account on activation.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-ink-900/60 p-4">
          <div className="flex items-center gap-2">
            <Icon name="key" size={15} className="text-accent-soft" />
            <p className="text-[13.5px] font-medium text-mist-100">Activate a license key</p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="License key">
                <Input
                  value={key}
                  onChange={(event) => setKey(event.target.value.toUpperCase())}
                  placeholder="HEX-XXXXX-XXXXX-XXXXX-XXXXX"
                  className="font-mono tracking-wider"
                  spellCheck={false}
                  autoComplete="off"
                />
              </Field>
            </div>
            <Button icon="check" loading={busy} onClick={activate} className="sm:mb-0.5">
              Activate
            </Button>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2 text-[12.5px] text-negative">
              <Icon name="alert" size={14} />
              {error}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default UpgradeModal;
