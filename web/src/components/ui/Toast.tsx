import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';

export type ToastTone = 'success' | 'danger' | 'info' | 'warning';

export interface Toast {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'> & { id?: number }) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { border: string; icon: string; iconName: IconName }> = {
  success: { border: 'border-positive/25', icon: 'border-positive/30 bg-positive/10 text-positive', iconName: 'check' },
  danger: { border: 'border-negative/25', icon: 'border-negative/30 bg-negative/10 text-negative', iconName: 'alert' },
  warning: { border: 'border-warn/25', icon: 'border-warn/30 bg-warn/10 text-warn', iconName: 'alert' },
  info: { border: 'border-accent/25', icon: 'border-accent/30 bg-accent/12 text-accent-soft', iconName: 'info' },
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, 'id'> & { id?: number }) => {
      const id = toast.id ?? nextId++;
      setToasts((current) => [...current.filter((entry) => entry.id !== id).slice(-3), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), toast.tone === 'danger' ? 7000 : 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[350px] flex-col gap-2.5">
        {toasts.map((toast) => {
          const style = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={['pointer-events-auto animate-slide-up rounded-xl border bg-ink-850/95 p-4 shadow-pop backdrop-blur', style.border].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span className={['flex h-7 w-7 shrink-0 items-center justify-center rounded-full border', style.icon].join(' ')}>
                  <Icon name={style.iconName} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-mist-100">{toast.title}</p>
                  {toast.description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-mist-400">{toast.description}</p>}
                  {toast.action && (
                    <button
                      type="button"
                      onClick={toast.action.onClick}
                      className="mt-2 text-[12.5px] font-medium text-accent-soft hover:text-white"
                    >
                      {toast.action.label}
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="rounded p-0.5 text-mist-500 transition-colors hover:text-mist-200"
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
