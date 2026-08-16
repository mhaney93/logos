"use client";

import { useState } from "react";
import { ClauseItem } from "./ClauseItem";
import { ClauseSupportSidebar } from "./ClauseSupportSidebar";

export function ClauseList({
  clauses,
  layers,
  categories,
}: {
  clauses: {
    id: string;
    text: string;
    support: string | null;
    author: { username: string };
    layer: { id: string; name: string; depth: number };
    category: { id: string; name: string };
  }[];
  layers: { id: string; name: string; depth: number }[];
  categories: { id: string; name: string }[];
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
            layerId={clause.layer.id}
            layerName={clause.layer.name}
            categoryId={clause.category.id}
            categoryName={clause.category.name}
            layers={layers}
            categories={categories}
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
