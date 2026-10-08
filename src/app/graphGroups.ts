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

export type GraphView = {
  collapsed: Set<string>;
  // Conclusions whose premises are on show.
  open: Set<string>;
  // Clauses shown even though they aren't final, e.g. a search match.
  pinned: Set<string>;
  // Premises whose conclusions are on show.
  below: Set<string>;
};

export function premisesByConclusion(argumentsList: ArgumentData[]) {
  return new Map(argumentsList.map((a) => [a.conclusionId, a.premises.map((p) => p.clauseId)]));
}

export function conclusionsByPremise(argumentsList: ArgumentData[]) {
  const conclusionsOf = new Map<string, string[]>();
  for (const a of argumentsList) {
    for (const p of a.premises) conclusionsOf.set(p.clauseId, [...(conclusionsOf.get(p.clauseId) ?? []), a.conclusionId]);
  }
  return conclusionsOf;
}

// Every clause the given clauses rest on: their premises, those premises' premises, and so on.
// Passing conclusionsByPremise instead walks the other way, to everything built on them.
export function premiseChain(ids: Iterable<string>, premisesOf: Map<string, string[]>) {
  const seen = new Set<string>();
  const stack = [...ids].flatMap((id) => premisesOf.get(id) ?? []);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(premisesOf.get(id) ?? []));
  }
  return seen;
}

// An open category shows only its final conclusions — clauses no argument in the
// same category uses as a premise — plus whatever chains have been opened from them.
// Clauses in folded categories all stay so their category's node still appears.
export function visibleChains(clauses: ClauseData[], argumentsList: ArgumentData[], view: GraphView) {
  const categoryOf = new Map(clauses.map((c) => [c.id, c.category]));
  const premisesOf = premisesByConclusion(argumentsList);
  const usedInOwnCategory = new Set<string>();
  for (const argument of argumentsList) {
    for (const p of argument.premises) {
      if (categoryOf.get(p.clauseId) === categoryOf.get(argument.conclusionId)) usedInOwnCategory.add(p.clauseId);
    }
  }

  const shown = new Set<string>();
  const stack = clauses
    .filter((c) => (!usedInOwnCategory.has(c.id) || view.pinned.has(c.id)) && !collapsedAncestor(c.category, view.collapsed))
    .map((c) => c.id);
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (shown.has(id)) continue;
    shown.add(id);
    if (view.open.has(id)) stack.push(...(premisesOf.get(id) ?? []));
  }

  // Arguments ending inside a folded category keep linking it to whatever else is
  // on the map, so folded categories still show how they connect.
  const folded = (id: string) => collapsedAncestor(categoryOf.get(id) ?? null, view.collapsed) !== null;
  const onMap = (id: string) => shown.has(id) || folded(id);
  const visibleArguments = argumentsList
    .map((a) => {
      if (shown.has(a.conclusionId) && view.open.has(a.conclusionId)) return a;
      if (!folded(a.conclusionId)) return null;
      return { ...a, premises: a.premises.filter((p) => onMap(p.clauseId)) };
    })
    .filter((a): a is ArgumentData => a !== null && a.premises.length > 0);

  return {
    clauses: clauses.filter((c) => onMap(c.id)),
    arguments: visibleArguments,
  };
}
