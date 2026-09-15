import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import UpgradeModal from '../components/license/UpgradeModal';

/**
 * The free tier can browse everything but cannot create pins. Every gated
 * action calls `requireUpgrade(reason)`, which either lets the action through
 * or opens the licensing modal with the reason attached.
 */

interface UpgradeContextValue {
  open: (reason?: string) => void;
  close: () => void;
  isOpen: boolean;
  reason: string | null;
  /** Runs `action` when the account is entitled, otherwise opens the modal. */
  guard: (entitled: boolean, reason: string | undefined, action: () => void) => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const open = useCallback((nextReason?: string) => {
    setReason(nextReason ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const guard = useCallback(
    (entitled: boolean, blockReason: string | undefined, action: () => void) => {
      if (entitled) action();
      else open(blockReason);
    },
    [open],
  );

  const value = useMemo(() => ({ open, close, isOpen, reason, guard }), [open, close, isOpen, reason, guard]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal open={isOpen} onClose={close} reason={reason} />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const context = useContext(UpgradeContext);
  if (!context) throw new Error('useUpgrade must be used inside <UpgradeProvider>');
  return context;
}
