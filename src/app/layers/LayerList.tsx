"use client";

import { useTransition } from "react";
import { deleteLayer } from "@/lib/actions/layers";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

export function LayerList({
  layers,
}: {
  layers: { id: string; name: string; depth: number }[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <ul className="flex flex-col gap-2">
      {layers.map((layer) => (
        <li
          key={layer.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-black/[.05] px-2 py-0.5 text-xs font-medium tabular-nums dark:bg-white/[.08]">
              depth {layer.depth}
            </span>
            <span>{layer.name}</span>
          </div>
          <button
            onClick={() => {
              if (!confirm(`Delete layer "${layer.name}"?`)) return;
              const password = getActionPassword();
              if (password === null) return;
              startTransition(async () => {
                try {
                  await deleteLayer(layer.id, password);
                } catch (err) {
                  if (err instanceof Error && err.message === "Incorrect password") {
                    clearActionPassword();
                  }
                  alert(err instanceof Error ? err.message : "Failed to delete");
                }
              });
            }}
            disabled={isPending}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        </li>
      ))}
      {layers.length === 0 && <p className="text-sm text-zinc-500">No layers yet.</p>}
    </ul>
  );
}
