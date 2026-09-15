import type { ReactNode } from 'react';
import Modal from './Modal';
import Button from './Button';

/** Thin wrapper around <Modal> for destructive confirmations. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  busy = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={description}
      icon={danger ? 'alert' : 'info'}
      iconTone={danger ? 'danger' : 'accent'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children ?? (
        <p className="text-[13px] leading-relaxed text-mist-400">
          This action cannot be undone. The pin, its detections and its collected PC information are removed permanently.
        </p>
      )}
    </Modal>
  );
}

export default ConfirmDialog;
