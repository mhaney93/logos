"use client";

import { useEffect, useState, useTransition } from "react";
import { updateClauseSupport } from "@/lib/actions/clauses";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

export function ClauseSupportSidebar({
  id,
  text,
  support,
  onClose,
}: {
  id: string;
  text: string;
  support: string | null;
  onClose: () => void;
}) {
  const [value, setValue] = useState(support ?? "");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(support ?? "");
  }, [id, support]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function save() {
    const password = getActionPassword();
    if (password === null) return;
    startTransition(async () => {
      try {
        await updateClauseSupport(id, value, password);
      } catch (err) {
        if (err instanceof Error && err.message === "Incorrect password") {
          clearActionPassword();
        }
        alert(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50"
      />
      <aside className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-black/[.08] bg-background p-6 dark:border-white/[.145]">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{text}</p>
          <button
            onClick={onClose}
            className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Close
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Why is this true?
          </label>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Add supporting explanation, evidence, or reasoning..."
            className="flex-1 min-h-40 resize-none rounded-lg border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145]"
          />
        </div>

        <button
          onClick={save}
          disabled={isPending}
          className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
        >
          Save
        </button>
      </aside>
    </>
  );
}
