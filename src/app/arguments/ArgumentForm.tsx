"use client";

import { useTransition } from "react";
import { createArgument } from "@/lib/actions/arguments";
import { getActionPassword, unwrapActionResult } from "@/lib/clientPassword";
import { PremiseConclusionPicker, usePremiseConclusionSelection } from "./PremiseConclusionPicker";

export function ArgumentForm({
  clauses,
}: {
  clauses: { id: string; text: string }[];
}) {
  const { premiseIds, conclusionId, togglePremise, toggleConclusion, reset } =
    usePremiseConclusionSelection();
  const [isPending, startTransition] = useTransition();

  const canSubmit = conclusionId !== null && premiseIds.length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit || !conclusionId) return;
        const password = getActionPassword();
        if (password === null) return;
        startTransition(async () => {
          const result = await createArgument(premiseIds, conclusionId, password);
          if (unwrapActionResult(result) === null) return;
          reset();
        });
      }}
      className="flex flex-col gap-4 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
    >
      <PremiseConclusionPicker
        clauses={clauses}
        premiseIds={premiseIds}
        conclusionId={conclusionId}
        onTogglePremise={togglePremise}
        onToggleConclusion={toggleConclusion}
      />

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
