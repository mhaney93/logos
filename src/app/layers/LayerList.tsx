"use client";

import { useState, useTransition } from "react";
import { deleteLayer, updateLayerName } from "@/lib/actions/layers";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

function LayerRow({ id, name, depth }: { id: string; name: string; depth: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [isPending, startTransition] = useTransition();

  if (isEditing) {
    return (
      <li className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
        <form
          className="flex flex-1 items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await updateLayerName(id, value, password);
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
          <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/[.08]">
            depth {depth}
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 rounded-full border border-black/[.08] px-3 py-1.5 text-sm dark:border-white/[.145]"
            autoFocus
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setIsEditing(false);
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/[.08]">
          depth {depth}
        </span>
        <span>{name}</span>
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
            if (!confirm(`Delete layer "${name}"?`)) return;
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await deleteLayer(id, password);
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

export function LayerList({
  layers,
}: {
  layers: { id: string; name: string; depth: number }[];
}) {
  return (
    <ul className="flex flex-col gap-2">
      {layers.map((layer) => (
        <LayerRow key={layer.id} id={layer.id} name={layer.name} depth={layer.depth} />
      ))}
      {layers.length === 0 && <p className="text-sm text-zinc-500">No layers yet.</p>}
    </ul>
  );
}
