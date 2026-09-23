export type ClauseData = { id: string; text: string; support: string | null };
export type ArgumentData = {
  id: string;
  conclusionId: string;
  premises: { clauseId: string }[];
};

// Groups are display-only: read from a clause's Notes, never asserted as logical links.
const GROUP_PATTERN = /^Subordinate virtue · ([^.]+?)(?: \(group head\))?\./;

export function groupOf(support: string | null) {
  return support?.match(GROUP_PATTERN)?.[1] ?? null;
}

export const groupNodeId = (group: string) => `group:${group}`;
export const clusterId = (group: string) => `cluster:${group}`;

// A grouped clause also claims its argument's private premises (used by no other
// argument and derived from nothing), so collapsing the group hides them too.
export function groupMembership(clauses: ClauseData[], argumentsList: ArgumentData[]) {
  const useCount = new Map<string, number>();
  for (const argument of argumentsList) {
    for (const premise of argument.premises) {
      useCount.set(premise.clauseId, (useCount.get(premise.clauseId) ?? 0) + 1);
    }
  }
  const concludedBy = new Map(argumentsList.map((a) => [a.conclusionId, a]));

  const membership = new Map<string, string>();
  const heads = new Map<string, number>();
  for (const clause of clauses) {
    const group = groupOf(clause.support);
    if (!group) continue;
    membership.set(clause.id, group);
    heads.set(group, (heads.get(group) ?? 0) + 1);
    for (const premise of concludedBy.get(clause.id)?.premises ?? []) {
      if (useCount.get(premise.clauseId) === 1 && !concludedBy.has(premise.clauseId)) {
        membership.set(premise.clauseId, group);
      }
    }
  }
  return { membership, virtueCounts: heads, groups: [...heads.keys()].sort() };
}

// Replace every clause in a collapsed group with that group's single node,
// rerouting arguments through it and dropping links that fall inside the group.
export function collapseGroups(
  clauses: ClauseData[],
  argumentsList: ArgumentData[],
  membership: Map<string, string>,
  collapsed: Set<string>,
) {
  const rep = (id: string) => {
    const group = membership.get(id);
    return group && collapsed.has(group) ? groupNodeId(group) : id;
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

  return {
    clauses: clauses.filter((c) => rep(c.id) === c.id),
    collapsedGroups: [...collapsed].filter((g) => [...membership.values()].includes(g)),
    arguments: visibleArguments,
  };
}
