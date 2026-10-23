import { categoryName, parentPath, type ClauseData } from "./graphGroups";

export type SearchMatch =
  | { kind: "category"; path: string }
  | { kind: "clause"; clause: ClauseData; snippet?: string };

export function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

const SNIPPET_CONTEXT = 30;

// The stretch of notes around the first hit, so a notes-only match shows why it matched.
export function notesSnippet(support: string, q: string) {
  const flat = support.replace(/\s+/g, " ").trim();
  const at = flat.toLowerCase().indexOf(q);
  if (at < 0) return undefined;
  const start = Math.max(0, at - SNIPPET_CONTEXT);
  const end = Math.min(flat.length, at + q.length + SNIPPET_CONTEXT);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

// Category hits come first: they're fewer, and jumping to one shows its clauses.
// Title hits outrank clauses that only match in their sidebar notes.
export function searchMatches(clauses: ClauseData[], paths: string[], query: string): SearchMatch[] {
  const q = normalizeQuery(query);
  if (!q) return [];
  const titleHits: SearchMatch[] = [];
  const notesHits: SearchMatch[] = [];
  for (const clause of clauses) {
    if (clause.text.toLowerCase().includes(q)) {
      titleHits.push({ kind: "clause", clause });
    } else if (clause.support) {
      const snippet = notesSnippet(clause.support, q);
      if (snippet) notesHits.push({ kind: "clause", clause, snippet });
    }
  }
  return [
    ...paths.filter((p) => categoryName(p).toLowerCase().includes(q)).map((path) => ({ kind: "category" as const, path })),
    ...titleHits,
    ...notesHits,
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
