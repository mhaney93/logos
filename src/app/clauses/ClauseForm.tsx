"use client";

import { useState, useTransition } from "react";
import { createClause } from "@/lib/actions/clauses";
import { getActionPassword, unwrapActionResult } from "@/lib/clientPassword";

export function ClauseForm() {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const trimmed = text.trim();
        if (!trimmed) return;
        const password = getActionPassword();
        if (password === null) return;
        startTransition(async () => {
          const result = await createClause(trimmed, password);
          if (unwrapActionResult(result) === null) return;
          setText("");
        });
      }}
      className="flex gap-2"
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="All humans are mortal"
        className="flex-1 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        required
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] active:scale-95 disabled:opacity-40 dark:hover:bg-[#ccc]"
      >
        Publish
      </button>
    </form>
  );
}
