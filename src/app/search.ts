import { categoryName, parentPath, type ClauseData } from "./graphGroups";

export type SearchMatch =
  | { kind: "category"; path: string }
  | { kind: "clause"; clause: ClauseData };

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

// Category hits come first: they're fewer, and jumping to one shows its clauses.
export function searchMatches(clauses: ClauseData[], paths: string[], query: string): SearchMatch[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  return [
    ...paths.filter((p) => categoryName(p).toLowerCase().includes(q)).map((path) => ({ kind: "category" as const, path })),
    ...clauses.filter((c) => c.text.toLowerCase().includes(q)).map((clause) => ({ kind: "clause" as const, clause })),
  ];
}

// "Ethics/Virtues/Courage" reads most specific first: "Courage <- Virtues <- Ethics".
export function categoryTrail(path: string | null) {
  return path ? path.split("/").reverse().join(" <- ") : "";
}

export function matchLabel(match: SearchMatch) {
  return match.kind === "category" ? categoryName(match.path) : match.clause.text;
}

// The categories a match sits in; a category's own name is its label, not its trail.
export function matchTrail(match: SearchMatch) {
  return categoryTrail(match.kind === "category" ? parentPath(match.path) : match.clause.category);
}

export function matchKey(match: SearchMatch) {
  return match.kind === "category" ? `category:${match.path}` : `clause:${match.clause.id}`;
}

// -1 means the input itself, so Up from the first row returns there.
export function moveHighlight(index: number, key: "ArrowDown" | "ArrowUp", count: number) {
  if (count === 0) return -1;
  return key === "ArrowDown" ? Math.min(index + 1, count - 1) : Math.max(index - 1, -1);
}

// The shown list lags the input while it's deferred, so Enter on a stale list searches what was typed.
export function enterTarget(
  shown: SearchMatch[],
  shownQuery: string,
  query: string,
  highlight: number,
  matchesFor: (query: string) => SearchMatch[],
): SearchMatch | undefined {
  if (normalizeQuery(shownQuery) !== normalizeQuery(query)) return matchesFor(query)[0];
  return shown[highlight] ?? shown[0];
}
