import { useState } from 'react';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';

/** A read-only value with a copy button — used for pin codes and download URLs. */
export function CopyField({
  label,
  value,
  icon,
  mono = true,
  hint,
  tracking = false,
  multiline = false,
}: {
  label?: string;
  value: string;
  icon?: IconName;
  mono?: boolean;
  hint?: string;
  tracking?: boolean;
  multiline?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable (http) — the value stays selectable */
    }
  };

  return (
    <div>
      {label && <p className="label-xs mb-2">{label}</p>}
      <div className="flex items-center gap-3 rounded-lg border border-line bg-ink-900 px-3 py-2.5">
        {icon && <Icon name={icon} size={15} className="shrink-0 text-mist-400" />}
        <span
          className={[
            'min-w-0 flex-1 text-[13.5px] text-mist-100',
            mono ? 'font-mono' : '',
            tracking ? 'tracking-[0.28em]' : '',
            multiline ? 'break-all' : 'truncate',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className={[
            'flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium transition-colors',
            copied ? 'border-positive/30 bg-positive/10 text-positive' : 'border-line bg-white/[0.03] text-mist-300 hover:text-mist-100',
          ].join(' ')}
        >
          <Icon name={copied ? 'check' : 'copy'} size={12} />
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {hint && <p className="mt-2 text-[12px] text-mist-500">{hint}</p>}
    </div>
  );
}

export default CopyField;
