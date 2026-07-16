"use client";

import { useState, useTransition } from "react";
import { deleteArgument, updateArgument } from "@/lib/actions/arguments";
import { clearActionPassword, getActionPassword } from "@/lib/clientPassword";
import { getArgumentForm, type ArgumentFormId } from "@/lib/argumentForms";
import { FormSelector } from "./FormSelector";
import { PremiseConclusionPicker } from "./PremiseConclusionPicker";

export function ArgumentItem({
  id,
  form,
  premises,
  conclusion,
  authorUsername,
  citationCount,
  allClauses,
}: {
  id: string;
  form: ArgumentFormId;
  premises: { clauseId: string; text: string }[];
  conclusion: { id: string; text: string };
  authorUsername: string;
  citationCount: number;
  allClauses: { id: string; text: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [argumentForm, setArgumentForm] = useState<ArgumentFormId>(form);
  const [premiseIds, setPremiseIds] = useState<Set<string>>(
    new Set(premises.map((p) => p.clauseId)),
  );
  const [conclusionId, setConclusionId] = useState<string | null>(conclusion.id);
  const [isPending, startTransition] = useTransition();

  function selectForm(id: ArgumentFormId) {
    setArgumentForm(id);
    setPremiseIds(new Set());
    setConclusionId(null);
  }

  function togglePremise(clauseId: string) {
    setPremiseIds((prev) => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  }

  function toggleConclusion(clauseId: string) {
    setConclusionId((prev) => (prev === clauseId ? null : clauseId));
    setPremiseIds((prev) => {
      if (!prev.has(clauseId)) return prev;
      const next = new Set(prev);
      next.delete(clauseId);
      return next;
    });
  }

  function resetAndCancel() {
    setArgumentForm(form);
    setPremiseIds(new Set(premises.map((p) => p.clauseId)));
    setConclusionId(conclusion.id);
    setIsEditing(false);
  }

  const shape = getArgumentForm(argumentForm);
  const meetsCount =
    premiseIds.size >= shape.minPremises &&
    (shape.maxPremises === null || premiseIds.size <= shape.maxPremises);
  const canSubmit = conclusionId !== null && meetsCount;

  if (isEditing) {
    return (
      <li className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit || !conclusionId) return;
            const password = getActionPassword();
            if (password === null) return;
            startTransition(async () => {
              try {
                await updateArgument(id, argumentForm, Array.from(premiseIds), conclusionId, password);
                setIsEditing(false);
              } catch (err) {
                if (err instanceof Error && err.message === "Incorrect password") {
                  clearActionPassword();
                }
                alert(err instanceof Error ? err.message : "Failed to save");
              }
            });
          }}
          className="flex flex-col gap-4"
        >
          <FormSelector value={argumentForm} onChange={selectForm} />
          <PremiseConclusionPicker
            clauses={allClauses}
            premiseIds={premiseIds}
            conclusionId={conclusionId}
            maxPremises={shape.maxPremises}
            onTogglePremise={togglePremise}
            onToggleConclusion={toggleConclusion}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canSubmit || isPending}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-40 dark:hover:bg-[#ccc]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={resetAndCancel}
              className="rounded-full px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.08]"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {shape.label}
      </p>
      <ul className="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        {premises.map((p) => (
          <li key={p.clauseId}>{p.text}</li>
        ))}
      </ul>
      <p className="mt-2 font-medium">→ {conclusion.text}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {authorUsername} · cited {citationCount} time
          {citationCount === 1 ? "" : "s"}
        </p>
        <div className="flex gap-3 text-xs font-medium">
          <button
            onClick={() => setIsEditing(true)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (!confirm("Delete this argument?")) return;
              const password = getActionPassword();
              if (password === null) return;
              startTransition(async () => {
                try {
                  await deleteArgument(id, password);
                } catch (err) {
                  if (err instanceof Error && err.message === "Incorrect password") {
                    clearActionPassword();
                  }
                  alert(err instanceof Error ? err.message : "Failed to delete");
                }
              });
            }}
            disabled={isPending}
            className="text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    </li>
  );
}
