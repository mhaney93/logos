"use client";

import { useState, useTransition } from "react";
import { deleteArgument, updateArgument } from "@/lib/actions/arguments";
import { getActionPassword, unwrapActionResult } from "@/lib/clientPassword";
import { PremiseConclusionPicker, usePremiseConclusionSelection } from "./PremiseConclusionPicker";
import { ConfirmDialog } from "@/app/components/ConfirmDialog";

export function ArgumentItem({
  id,
  premises,
  conclusion,
  citationCount,
  allClauses,
}: {
  id: string;
  premises: { clauseId: string; text: string }[];
  conclusion: { id: string; text: string };
  citationCount: number;
  allClauses: { id: string; text: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const { premiseIds, conclusionId, togglePremise, toggleConclusion, reset } =
    usePremiseConclusionSelection(
      premises.map((p) => p.clauseId),
      conclusion.id,
    );
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function runDelete() {
    setConfirmingDelete(false);
    const password = getActionPassword();
    if (password === null) return;
    startTransition(async () => {
      const result = await deleteArgument(id, password);
      unwrapActionResult(result);
    });
  }

  function resetAndCancel() {
    reset();
    setIsEditing(false);
  }

  const canSubmit = conclusionId !== null && premiseIds.length > 0;

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
              const result = await updateArgument(id, premiseIds, conclusionId, password);
              if (unwrapActionResult(result) === null) return;
              setIsEditing(false);
            });
          }}
          className="flex flex-col gap-4"
        >
          <PremiseConclusionPicker
            clauses={allClauses}
            premiseIds={premiseIds}
            conclusionId={conclusionId}
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
      <ol className="list-decimal pl-5 text-sm text-zinc-600 dark:text-zinc-400">
        {premises.map((p) => (
          <li key={p.clauseId}>{p.text}</li>
        ))}
      </ol>
      <p className="mt-2 font-medium">→ {conclusion.text}</p>
      <div className="mt-1 flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          cited {citationCount} time
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
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            className="text-red-600 hover:text-red-800 disabled:opacity-40 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this argument?"
        onConfirm={runDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </li>
  );
}
