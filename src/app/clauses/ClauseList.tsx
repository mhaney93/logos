"use client";

import { useState } from "react";
import { ClauseItem } from "./ClauseItem";
import { ClauseSupportSidebar } from "./ClauseSupportSidebar";

export function ClauseList({
  clauses,
}: {
  clauses: {
    id: string;
    text: string;
    support: string | null;
    author: { username: string };
  }[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = clauses.find((c) => c.id === selectedId) ?? null;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {clauses.map((clause) => (
          <ClauseItem
            key={clause.id}
            id={clause.id}
            text={clause.text}
            authorUsername={clause.author.username}
            onSelect={() => setSelectedId(clause.id)}
          />
        ))}
        {clauses.length === 0 && (
          <p className="text-sm text-zinc-500">No clauses yet.</p>
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
