"use client";

import { useEffect, useRef } from "react";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-4 w-full max-w-sm rounded-2xl border border-black/[.08] bg-background p-5 shadow-xl dark:border-white/[.145]"
      >
        <h2 id="confirm-dialog-title" className="text-sm font-semibold">
          {title}
        </h2>
        {message && (
          <p className="mt-1.5 text-sm text-zinc-500">{message}</p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
