"use client";

import { useState, useTransition } from "react";
import { createCategory } from "@/lib/actions/categories";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";

export function CategoryForm() {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        const password = getActionPassword();
        if (password === null) return;
        startTransition(async () => {
          try {
            await createCategory(trimmed, password);
            setName("");
          } catch (err) {
            if (err instanceof Error && err.message === "Incorrect password") {
              clearActionPassword();
            }
            alert(err instanceof Error ? err.message : "Failed to create category");
          }
        });
      }}
      className="flex gap-2"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Metaethics"
        className="flex-1 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] active:scale-95 disabled:opacity-40 dark:hover:bg-[#ccc]"
      >
        Add category
      </button>
    </form>
  );
}
