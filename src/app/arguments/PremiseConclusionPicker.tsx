"use client";

import { useState } from "react";

export function usePremiseConclusionSelection(
  initialPremiseIds: string[] = [],
  initialConclusionId: string | null = null,
) {
  const [premiseIds, setPremiseIds] = useState<string[]>(initialPremiseIds);
  const [conclusionId, setConclusionId] = useState<string | null>(initialConclusionId);

  function togglePremise(id: string) {
    setPremiseIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleConclusion(id: string) {
    setConclusionId((prev) => (prev === id ? null : id));
    setPremiseIds((prev) => prev.filter((p) => p !== id));
  }

  function reset() {
    setPremiseIds(initialPremiseIds);
    setConclusionId(initialConclusionId);
  }

  return { premiseIds, conclusionId, togglePremise, toggleConclusion, reset };
}

export function PremiseConclusionPicker({
  clauses,
  premiseIds,
  conclusionId,
  onTogglePremise,
  onToggleConclusion,
}: {
  clauses: { id: string; text: string }[];
  premiseIds: string[];
  conclusionId: string | null;
  onTogglePremise: (id: string) => void;
  onToggleConclusion: (id: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        Premises, in the order you click them, and one conclusion
      </legend>
      {clauses.map((clause) => {
        const isConclusion = conclusionId === clause.id;
        const premiseIndex = premiseIds.indexOf(clause.id);
        const isPremise = premiseIndex !== -1;
        return (
          <div key={clause.id} className="flex items-center gap-3 text-sm">
            <label className="flex w-24 shrink-0 items-center gap-1.5">
              <input
                type="checkbox"
                checked={isPremise}
                disabled={isConclusion}
                onChange={() => onTogglePremise(clause.id)}
              />
              premise{isPremise ? ` ${premiseIndex + 1}` : ""}
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={isConclusion}
                onChange={() => onToggleConclusion(clause.id)}
              />
              conclusion
            </label>
            <span className="truncate">{clause.text}</span>
          </div>
        );
      })}
    </fieldset>
  );
}
