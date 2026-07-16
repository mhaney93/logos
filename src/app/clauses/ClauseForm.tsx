"use client";

import { useEffect, useState, useTransition } from "react";
import { createClause, findSimilarClauses } from "@/lib/actions/clauses";

export function ClauseForm() {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState<{ id: string; text: string; distance: number }[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed.length < 8) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(() => {
      findSimilarClauses(trimmed).then((results) => {
        // Voyage cosine distances for true paraphrases tend to land ~0.35-0.5
        setSuggestions(results.filter((r) => r.distance < 0.5));
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [text]);

  return (
    <div className="flex flex-col gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = text.trim();
          if (!trimmed) return;
          startTransition(async () => {
            await createClause(trimmed);
            setText("");
            setSuggestions([]);
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

      {suggestions.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950">
          <p className="mb-1.5 font-medium text-amber-900 dark:text-amber-200">
            Similar clauses already exist — consider reusing one instead:
          </p>
          <ul className="flex flex-col gap-1 text-amber-800 dark:text-amber-300">
            {suggestions.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
