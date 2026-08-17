export type CategoryNode = { id: string; name: string; parentId: string | null };

// Flattens categories into depth-first tree order, each with its depth (root = 0).
export function flattenCategoryTree<T extends CategoryNode>(
  categories: T[],
): (T & { depth: number })[] {
  const byParent = new Map<string | null, T[]>();
  for (const c of categories) {
    byParent.set(c.parentId, [...(byParent.get(c.parentId) ?? []), c]);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const result: (T & { depth: number })[] = [];
  function visit(parentId: string | null, depth: number) {
    for (const c of byParent.get(parentId) ?? []) {
      result.push({ ...c, depth });
      visit(c.id, depth + 1);
    }
  }
  visit(null, 0);
  return result;
}

// All descendant IDs of rootId, inclusive.
export function categoryAndDescendantIds<T extends CategoryNode>(
  categories: T[],
  rootId: string,
): string[] {
  const childrenOf = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) ?? []), c.id]);
  }
  const ids: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    ids.push(id);
    stack.push(...(childrenOf.get(id) ?? []));
  }
  return ids;
}
