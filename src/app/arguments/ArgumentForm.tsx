"use client";

import { useState, useTransition } from "react";
import { createArgument } from "@/lib/actions/arguments";
import { getArgumentForm, type ArgumentFormId } from "@/lib/argumentForms";
import { FormSelector } from "./FormSelector";
import { PremiseConclusionPicker } from "./PremiseConclusionPicker";

export function ArgumentForm({
  clauses,
}: {
  clauses: { id: string; text: string }[];
}) {
  const [argumentForm, setArgumentForm] = useState<ArgumentFormId | null>(null);
  const [premiseIds, setPremiseIds] = useState<Set<string>>(new Set());
  const [conclusionId, setConclusionId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectForm(id: ArgumentFormId) {
    setArgumentForm(id);
    setPremiseIds(new Set());
    setConclusionId(null);
  }

  function togglePremise(id: string) {
    setPremiseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleConclusion(id: string) {
    setConclusionId((prev) => (prev === id ? null : id));
    setPremiseIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const shape = argumentForm ? getArgumentForm(argumentForm) : null;
  const meetsCount =
    shape !== null &&
    premiseIds.size >= shape.minPremises &&
    (shape.maxPremises === null || premiseIds.size <= shape.maxPremises);
  const canSubmit = argumentForm !== null && conclusionId !== null && meetsCount;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || !argumentForm || !conclusionId) return;
        startTransition(async () => {
          await createArgument(argumentForm, Array.from(premiseIds), conclusionId);
          setArgumentForm(null);
          setPremiseIds(new Set());
          setConclusionId(null);
        });
      }}
      className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
    >
      <FormSelector value={argumentForm} onChange={selectForm} />

      {shape && (
        <PremiseConclusionPicker
          clauses={clauses}
          premiseIds={premiseIds}
          conclusionId={conclusionId}
          maxPremises={shape.maxPremises}
          onTogglePremise={togglePremise}
          onToggleConclusion={toggleConclusion}
        />
      )}

      <button
        type="submit"
        disabled={!canSubmit || isPending}
        className="self-start rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] active:scale-95 disabled:opacity-40 dark:hover:bg-[#ccc]"
      >
        Build argument
      </button>
    </form>
  );
}
