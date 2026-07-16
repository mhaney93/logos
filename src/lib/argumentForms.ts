export type ArgumentFormId =
  | "MODUS_PONENS"
  | "MODUS_TOLLENS"
  | "HYPOTHETICAL_SYLLOGISM"
  | "DISJUNCTIVE_SYLLOGISM"
  | "CATEGORICAL_SYLLOGISM"
  | "SIMPLE_INFERENCE"
  | "CUMULATIVE_CASE";

export const ARGUMENT_FORMS: {
  id: ArgumentFormId;
  label: string;
  description: string;
  minPremises: number;
  maxPremises: number | null;
}[] = [
  {
    id: "MODUS_PONENS",
    label: "Modus Ponens",
    description: "If P, then Q. P. Therefore, Q.",
    minPremises: 2,
    maxPremises: 2,
  },
  {
    id: "MODUS_TOLLENS",
    label: "Modus Tollens",
    description: "If P, then Q. Not Q. Therefore, not P.",
    minPremises: 2,
    maxPremises: 2,
  },
  {
    id: "HYPOTHETICAL_SYLLOGISM",
    label: "Hypothetical Syllogism",
    description: "If P, then Q. If Q, then R. Therefore, if P, then R.",
    minPremises: 2,
    maxPremises: 2,
  },
  {
    id: "DISJUNCTIVE_SYLLOGISM",
    label: "Disjunctive Syllogism",
    description: "P or Q. Not P. Therefore, Q.",
    minPremises: 2,
    maxPremises: 2,
  },
  {
    id: "CATEGORICAL_SYLLOGISM",
    label: "Categorical Syllogism",
    description: "All A are B. All B are C. Therefore, all A are C.",
    minPremises: 2,
    maxPremises: 2,
  },
  {
    id: "SIMPLE_INFERENCE",
    label: "Simple Inference",
    description: "A single premise directly supports the conclusion.",
    minPremises: 1,
    maxPremises: 1,
  },
  {
    id: "CUMULATIVE_CASE",
    label: "Cumulative Case",
    description: "Several premises jointly support the conclusion.",
    minPremises: 2,
    maxPremises: null,
  },
];

export function getArgumentForm(id: ArgumentFormId) {
  const form = ARGUMENT_FORMS.find((f) => f.id === id);
  if (!form) throw new Error(`Unknown argument form: ${id}`);
  return form;
}
