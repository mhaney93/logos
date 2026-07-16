"use client";

import { useState } from "react";

export function ConclusionCard({
  premises,
  conclusionText,
  authorUsername,
  citationCount,
}: {
  premises: { clauseId: string; text: string }[];
  conclusionText: string;
  authorUsername: string;
  citationCount: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => setIsExpanded((prev) => !prev)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
      aria-expanded={isExpanded}
      className="cursor-pointer rounded-lg border border-black/[.08] p-4 transition-colors hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
    >
      <p className="font-medium">{conclusionText}</p>
      {isExpanded && (
        <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
          {premises.map((p) => (
            <li key={p.clauseId}>{p.text}</li>
          ))}
        </ul>
      )}
      <p className="mt-1 text-xs text-zinc-500">
        {authorUsername} · cited {citationCount} time
        {citationCount === 1 ? "" : "s"}
      </p>
    </li>
  );
}
