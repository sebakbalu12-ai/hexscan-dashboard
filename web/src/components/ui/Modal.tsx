import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconTone = 'accent',
  size = 'md',
  footer,
  children,
  closeOnBackdrop = true,
  className = '',
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTone?: 'accent' | 'success' | 'danger' | 'warning';
  size?: Size;
  footer?: ReactNode;
  children: ReactNode;
  closeOnBackdrop?: boolean;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const iconToneClass =
    iconTone === 'success'
      ? 'border-positive/30 bg-positive/10 text-positive'
      : iconTone === 'danger'
        ? 'border-negative/30 bg-negative/10 text-negative'
        : iconTone === 'warning'
          ? 'border-warn/30 bg-warn/10 text-warn'
          : 'border-accent/30 bg-accent/12 text-accent-soft';

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[3px] animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={['relative z-10 w-full animate-pop-in card p-0 shadow-pop', SIZES[size], className].join(' ')}
      >
        {(title || subtitle) && (
          <div className="flex items-start justify-between gap-4 border-b border-line p-5">
            <div className="flex items-start gap-3">
              {icon && (
                <span className={['flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border', iconToneClass].join(' ')}>
                  <Icon name={icon} size={17} />
                </span>
              )}
              <div>
                {title && <h2 className="text-[15px] font-semibold tracking-tight text-mist-100">{title}</h2>}
                {subtitle && <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-mist-400">{subtitle}</p>}
              </div>
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
        )}

        <div className="p-5">{children}</div>

        {footer && <div className="flex items-center justify-end gap-2 border-t border-line p-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
