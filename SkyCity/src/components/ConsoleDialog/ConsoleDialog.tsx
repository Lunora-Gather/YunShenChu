import { useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ConsoleDialogProps {
  className: string;
  titleId: string;
  opener: HTMLElement | null;
  fallbackFocusId?: string;
  onClose: () => void;
  children: ReactNode;
}

export default function ConsoleDialog({ className, titleId, opener, fallbackFocusId = 'signal-toolbar-trigger', onClose, children }: ConsoleDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-dialog-focus]')?.focus();

    return () => {
      dialog.close();
      if (opener?.isConnected && opener !== document.body) {
        opener.focus({ preventScroll: true });
        if (document.activeElement === opener) return;
      }
      const fallback = document.getElementById(fallbackFocusId) ?? document.getElementById('signal-toolbar-trigger');
      fallback?.focus({ preventScroll: true });
    };
  }, [opener, fallbackFocusId]);

  return (
    <dialog
      ref={dialogRef}
      className={`console-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {children}
    </dialog>
  );
}
