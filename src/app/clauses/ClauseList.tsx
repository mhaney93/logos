"use client";

import { useState } from "react";
import { ClauseItem } from "./ClauseItem";
import { ClauseSupportSidebar } from "./ClauseSupportSidebar";

export function ClauseList({
  clauses,
  query,
}: {
  clauses: {
    id: string;
    text: string;
    support: string | null;
  }[];
  query: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = clauses.find((c) => c.id === selectedId) ?? null;

  const trimmedQuery = query.trim().toLowerCase();
  const visibleClauses = trimmedQuery
    ? clauses.filter((c) => c.text.toLowerCase().includes(trimmedQuery))
    : clauses;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {visibleClauses.map((clause) => (
          <ClauseItem
            key={clause.id}
            id={clause.id}
            text={clause.text}
            onSelect={() => setSelectedId(clause.id)}
          />
        ))}
        {clauses.length === 0 && (
          <p className="text-sm text-zinc-500">No clauses yet.</p>
        )}
        {clauses.length > 0 && visibleClauses.length === 0 && (
          <p className="text-sm text-zinc-500">No clauses match &quot;{query}&quot;.</p>
        )}
      </ul>

      {selected && (
        <ClauseSupportSidebar
          id={selected.id}
          text={selected.text}
          support={selected.support}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
