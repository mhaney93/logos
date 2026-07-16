"use client";

import { useState, useTransition } from "react";
import { deleteClause, updateClause } from "@/lib/actions/clauses";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

export function ClauseItem({
  id,
  text,
  authorUsername,
}: {
  id: string;
  text: string;
  authorUsername: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);
  const [isPending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <li className="rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await updateClause(id, value, password);
                setIsEditing(false);
              } catch (err) {
                if (err instanceof Error && err.message === "Incorrect password") {
                  clearActionPassword();
                }
                alert(err instanceof Error ? err.message : "Failed to save");
              }
            });
          }}
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-full border border-black/[.08] px-4 py-1.5 text-sm dark:border-white/[.145]"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(text);
              setIsEditing(false);
            }}
            className="rounded-full px-3 py-1.5 text-sm font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      <div>
        <p>{text}</p>
        <p className="mt-1 text-xs text-zinc-500">{authorUsername}</p>
      </div>
      <div className="flex shrink-0 gap-3 text-xs font-medium">
        <button
          onClick={() => setIsEditing(true)}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Edit
        </button>
        <button
          onClick={() => {
            if (!confirm("Delete this clause?")) return;
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await deleteClause(id, password);
              } catch (err) {
                if (err instanceof Error && err.message === "Incorrect password") {
                  clearActionPassword();
                }
                alert(err instanceof Error ? err.message : "Failed to delete");
              }
            });
          }}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
