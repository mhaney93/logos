"use client";

import { useState } from "react";
import { ClauseForm } from "./ClauseForm";
import { ClauseList } from "./ClauseList";

export function ClausesPageClient({
  clauses,
}: {
  clauses: { id: string; text: string; support: string | null }[];
}) {
  const [query, setQuery] = useState("");

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search clauses…"
        className="w-full rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
      />

      <ClauseForm />

      <ClauseList clauses={clauses} query={query} />
    </>
  );
}
