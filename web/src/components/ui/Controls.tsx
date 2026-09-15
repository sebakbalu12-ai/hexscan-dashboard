import { Fragment, useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';

/* ------------------------------- Inputs -------------------------------- */

export function Field({ label, hint, required, children }: { label: ReactNode; hint?: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label-xs flex items-center gap-1">
        {label}
        {required && <span className="text-negative">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-[12px] text-mist-500">{hint}</span>}
    </label>
  );
}

export function Input({ icon, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName }) {
  if (!icon) return <input className={['input', className].join(' ')} {...rest} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist-500">
        <Icon name={icon} size={15} />
      </span>
      <input className={['input pl-9', className].join(' ')} {...rest} />
    </div>
  );
}

export function Select({ className = '', children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={['select', className].join(' ')} {...rest}>
      {children}
    </select>
  );
}

/* ------------------------------- Toggle -------------------------------- */

export function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 disabled:opacity-40',
        checked ? 'border-accent/40 bg-accent' : 'border-line-strong bg-ink-700',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
        ].join(' ')}
        style={{ height: 18, width: 18 }}
      />
    </button>
  );
}

/* ------------------------------- Tabs ---------------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-ink-900/80 p-1">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={[
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
              active ? 'bg-white/[0.07] text-mist-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-mist-400 hover:text-mist-200',
            ].join(' ')}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={[
                  'rounded px-1.5 py-0.5 font-mono text-[11px]',
                  active ? 'bg-accent/20 text-accent-soft' : 'bg-white/[0.05] text-mist-400',
                ].join(' ')}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------- Progress bar ----------------------------- */

export function ProgressBar({
  value,
  tone = 'accent',
  indeterminate = false,
  className = '',
  height = 6,
}: {
  value?: number;
  tone?: 'accent' | 'positive' | 'negative' | 'warning';
  indeterminate?: boolean;
  className?: string;
  height?: number;
}) {
  const fill =
    tone === 'positive' ? 'bg-positive' : tone === 'negative' ? 'bg-negative' : tone === 'warning' ? 'bg-warn' : 'bg-accent';

  return (
    <div
      className={['relative w-full overflow-hidden rounded-full bg-white/[0.06]', className].join(' ')}
      style={{ height }}
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
    >
      {indeterminate ? (
        <span className={['absolute inset-y-0 w-1/3 rounded-full opacity-80', fill].join(' ')} style={{ animation: 'shimmer 1.8s ease-in-out infinite' }} />
      ) : (
        <span
          className={['block h-full rounded-full transition-[width] duration-500 ease-out', fill].join(' ')}
          style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
        />
      )}
    </div>
  );
}

/* ------------------------------ Dropdown ------------------------------- */

export function Menu({
  trigger,
  items,
  align = 'right',
  width = 210,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  items: { label: string; icon?: IconName; tone?: 'default' | 'danger'; onSelect?: () => void; separator?: boolean; disabled?: boolean }[];
  align?: 'left' | 'right';
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div
          className={[
            'absolute z-40 mt-2 animate-pop-in overflow-hidden rounded-xl border border-line-strong bg-ink-800/98 p-1.5 shadow-pop backdrop-blur',
            align === 'right' ? 'right-0' : 'left-0',
          ].join(' ')}
          style={{ width }}
          role="menu"
        >
          {items.map((item, index) => (
            // `separator` draws a divider ABOVE the entry (never replaces it).
            <Fragment key={item.label}>
              {item.separator && index > 0 && <div className="my-1 h-px bg-line" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={[
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                  item.tone === 'danger' ? 'text-negative hover:bg-negative/10' : 'text-mist-200 hover:bg-white/[0.06]',
                ].join(' ')}
              >
                {item.icon && <Icon name={item.icon} size={15} className="shrink-0" />}
                {item.label}
              </button>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Misc ---------------------------------- */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['animate-pulse-soft rounded-md bg-white/[0.05]', className].join(' ')} />;
}

export function EmptyState({
  icon = 'search',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-mist-400">
        <Icon name={icon} size={19} />
      </span>
      <div>
        <p className="text-[14px] font-medium text-mist-200">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-mist-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default Field;
