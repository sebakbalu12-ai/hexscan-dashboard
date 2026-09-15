import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { Badge } from '../ui/Badge';
import { formatPrice } from '../../lib/format';
import type { Plan } from '../../lib/types';

/** One pricing tile used by the upgrade modal and the license settings page. */
export function PlanCard({
  plan,
  selected = false,
  onSelect,
  ctaLabel = 'Choose plan',
  compact = false,
}: {
  plan: Plan;
  selected?: boolean;
  onSelect?: () => void;
  ctaLabel?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        'relative flex flex-col rounded-xl border p-4 transition-colors',
        selected ? 'border-accent/50 bg-accent/[0.07]' : 'border-line bg-ink-900/60 hover:border-line-strong',
      ].join(' ')}
    >
      {plan.popular && (
        <span className="absolute -top-2.5 left-4">
          <Badge tone="accent" icon={<Icon name="spark" size={11} />}>
            Most popular
          </Badge>
        </span>
      )}

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[14px] font-semibold text-mist-100">{plan.label}</p>
        <Badge tone={plan.durationDays === null ? 'accent' : 'neutral'}>
          {plan.durationDays === null ? 'Forever' : `${plan.durationDays} days`}
        </Badge>
      </div>

      <p className="mt-1 text-[12px] text-mist-500">{plan.tagline}</p>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-[24px] font-semibold tracking-tight text-mist-100">{formatPrice(plan.price, plan.currency)}</span>
        <span className="text-[12px] text-mist-500">{plan.durationDays === null ? 'once' : 'one time'}</span>
      </div>

      <ul className={['mt-3 space-y-1.5', compact ? 'hidden sm:block' : ''].join(' ')}>
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-[12px] text-mist-300">
            <Icon name="check" size={13} className="mt-0.5 shrink-0 text-positive" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex-1" />
      {onSelect && (
        <Button variant={plan.popular ? 'primary' : 'ghost'} block onClick={onSelect}>
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}

export default PlanCard;
