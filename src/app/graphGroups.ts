export type ClauseData = {
  id: string;
  text: string;
  support: string | null;
  category: string | null;
};
export type ArgumentData = {
  id: string;
  conclusionId: string;
  premises: { clauseId: string }[];
};

// Categories are display-only folder paths ("Ethics/Virtues/Courage"), never
// logical links. Every prefix of a path is itself a foldable category.
export const groupNodeId = (path: string) => `group:${path}`;
export const clusterId = (path: string) => `cluster:${path}`;
export const categoryName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
export const parentPath = (path: string) =>
  path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : null;

export function prefixes(path: string) {
  const parts = path.split("/");
  return parts.map((_, i) => parts.slice(0, i + 1).join("/"));
}

export function allCategoryPaths(clauses: ClauseData[]) {
  const paths = new Set<string>();
  for (const clause of clauses) {
    if (clause.category) for (const p of prefixes(clause.category)) paths.add(p);
  }
  return [...paths].sort();
}

export function clauseCounts(clauses: ClauseData[]) {
  const counts = new Map<string, number>();
  for (const clause of clauses) {
    if (!clause.category) continue;
    for (const p of prefixes(clause.category)) counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return counts;
}

// The outermost collapsed category containing this path, if any.
export function collapsedAncestor(path: string | null, collapsed: Set<string>) {
  return path ? (prefixes(path).find((p) => collapsed.has(p)) ?? null) : null;
}

// Replace every clause inside a collapsed category with that category's single
// node, rerouting arguments through it and dropping links that fall inside it.
export function collapseCategories(
  clauses: ClauseData[],
  argumentsList: ArgumentData[],
  collapsed: Set<string>,
) {
  const categoryOf = new Map(clauses.map((c) => [c.id, c.category]));
  const rep = (id: string) => {
    const folded = collapsedAncestor(categoryOf.get(id) ?? null, collapsed);
    return folded ? groupNodeId(folded) : id;
  };

  const visibleArguments = argumentsList
    .map((argument) => {
      const conclusionId = rep(argument.conclusionId);
      const seen = new Set<string>();
      const premises = argument.premises
        .map((p) => rep(p.clauseId))
        .filter((id) => id !== conclusionId && !seen.has(id) && Boolean(seen.add(id)))
        .map((clauseId) => ({ clauseId }));
      return { id: argument.id, conclusionId, premises };
    })
    .filter((argument) => argument.premises.length > 0);

  const foldedPaths = new Set<string>();
  const visibleClauses: ClauseData[] = [];
  for (const clause of clauses) {
    const folded = collapsedAncestor(clause.category, collapsed);
    if (folded) foldedPaths.add(folded);
    else visibleClauses.push(clause);
  }

  return { clauses: visibleClauses, foldedPaths: [...foldedPaths].sort(), arguments: visibleArguments };
}
