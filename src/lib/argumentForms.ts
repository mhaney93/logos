export const VALID_ARGUMENT_FORMS: { label: string; description: string }[] = [
  { label: "Modus Ponens", description: "If P, then Q. P. Therefore, Q." },
  { label: "Modus Tollens", description: "If P, then Q. Not Q. Therefore, not P." },
  {
    label: "Hypothetical Syllogism",
    description: "If P, then Q. If Q, then R. Therefore, if P, then R.",
  },
  { label: "Disjunctive Syllogism", description: "P or Q. Not P. Therefore, Q." },
  {
    label: "Categorical Syllogism",
    description: "All A are B. All B are C. Therefore, all A are C.",
  },
];
