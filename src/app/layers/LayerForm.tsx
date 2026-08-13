"use client";

import { useState, useTransition } from "react";
import { createLayer } from "@/lib/actions/layers";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

export function LayerForm({ existingDepths }: { existingDepths: number[] }) {
  const [name, setName] = useState("");
  const [depth, setDepth] = useState(
    existingDepths.length > 0 ? String(Math.max(...existingDepths) + 1) : "0",
  );
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        const depthNum = Number(depth);
        if (!trimmed || !Number.isInteger(depthNum)) return;
        const password = getActionPassword();
        if (password === null) return;
        startTransition(async () => {
          try {
            await createLayer(trimmed, depthNum, password);
            setName("");
            setDepth(String(depthNum + 1));
          } catch (err) {
            if (err instanceof Error && err.message === "Incorrect password") {
              clearActionPassword();
            }
            alert(err instanceof Error ? err.message : "Failed to create layer");
          }
        });
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Psychology"
        className="flex-1 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        required
      />
      <input
        value={depth}
        onChange={(e) => setDepth(e.target.value)}
        type="number"
        placeholder="Depth"
        className="w-24 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] active:scale-95 disabled:opacity-40 dark:hover:bg-[#ccc]"
      >
        Add layer
      </button>
    </form>
  );
}
