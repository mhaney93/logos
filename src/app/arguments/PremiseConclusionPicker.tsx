"use client";

export function PremiseConclusionPicker({
  clauses,
  premiseIds,
  conclusionId,
  maxPremises,
  onTogglePremise,
  onToggleConclusion,
}: {
  clauses: { id: string; text: string }[];
  premiseIds: Set<string>;
  conclusionId: string | null;
  maxPremises: number | null;
  onTogglePremise: (id: string) => void;
  onToggleConclusion: (id: string) => void;
}) {
  const atMax = maxPremises !== null && premiseIds.size >= maxPremises;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        Premises ({premiseIds.size}
        {maxPremises !== null ? `/${maxPremises}` : ""}) and conclusion (pick
        one)
      </legend>
      {clauses.map((clause) => {
        const isConclusion = conclusionId === clause.id;
        const isPremise = premiseIds.has(clause.id);
        return (
          <div key={clause.id} className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={isPremise}
                disabled={isConclusion || (atMax && !isPremise)}
                onChange={() => onTogglePremise(clause.id)}
              />
              premise
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
