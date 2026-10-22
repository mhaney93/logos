import dagre from "dagre";
import { clusterId, groupNodeId, parentPath, prefixes, type ArgumentData, type ClauseData } from "./graphGroups";

export const CLAUSE_WIDTH = 240;
export const CLAUSE_MIN_HEIGHT = 56;
export const FRAME_HEADER = 30;
const SIBLING_GAP = 60;
const FRAME_PADDING = 20;

export type Box = { left: number; top: number; right: number; bottom: number };
export type Placed = { x: number; y: number; width: number; height: number };

const within = (path: string, container: string | null) =>
  container === null || path === container || path.startsWith(`${container}/`);

// The category directly inside the container that holds this path.
const childOf = (path: string, container: string | null) =>
  path.split("/").slice(0, container === null ? 1 : container.split("/").length + 1).join("/");

// dagre's compound (clustered) mode can hand two nodes the same slot in a row on
// graphs like this one; the loser never gets a position and layout throws "Not
// possible to find intersection inside of the rectangle". It is also ~10x slower.
// So lay out each open category as a plain graph of its own loose clauses, folded
// sub-categories and already laid-out sub-category blocks, innermost first.
// Links between clauses in different sub-categories become links between their blocks.
function placeNested(
  clauses: ClauseData[],
  links: [string, string][],
  openPaths: Set<string>,
  foldedPaths: string[],
  heights: Map<string, number>,
) {
  const folded = new Set(foldedPaths);
  const location = new Map<string, string | null>([
    ...clauses.map((c) => [c.id, c.category] as const),
    ...foldedPaths.map((p) => [groupNodeId(p), p] as const),
  ]);
  const memberIn = (id: string, container: string | null) => {
    const path = location.get(id);
    if (path === undefined) return null;
    if (path === container) return id;
    if (path === null || !within(path, container)) return null;
    const child = childOf(path, container);
    return folded.has(child) ? groupNodeId(child) : clusterId(child);
  };

  const placed = new Map<string, Placed>();
  type Block = { width: number; height: number; place: (left: number, top: number) => void };

  function layOut(container: string | null): Block {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 110 });
    graph.setDefaultEdgeLabel(() => ({}));
    const blocks = new Map<string, Block>();

    for (const c of clauses) {
      if (c.category === container) graph.setNode(c.id, { width: CLAUSE_WIDTH, height: heights.get(c.id)! });
    }
    // One sorted pass, so a sub-category keeps its place in line whether it's folded or open.
    const children = [...openPaths, ...foldedPaths].filter((p) => parentPath(p) === container).sort();
    for (const p of children) {
      if (folded.has(p)) {
        graph.setNode(groupNodeId(p), { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT });
      } else {
        const block = layOut(p);
        blocks.set(clusterId(p), block);
        graph.setNode(clusterId(p), { width: block.width, height: block.height });
      }
    }
    for (const [from, to] of links) {
      const a = memberIn(from, container);
      const b = memberIn(to, container);
      if (a && b && a !== b) graph.setEdge(a, b);
    }
    dagre.layout(graph);

    const nodes = graph.nodes().map((id) => ({ id, ...(graph.node(id) as Placed) }));
    const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
    const top = Math.min(...nodes.map((n) => n.y - n.height / 2));
    const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
    const bottom = Math.max(...nodes.map((n) => n.y + n.height / 2));
    const padX = container === null ? 0 : FRAME_PADDING;
    const padTop = container === null ? 0 : FRAME_PADDING + FRAME_HEADER;
    const padBottom = container === null ? 0 : FRAME_PADDING;
    return {
      width: right - left + 2 * padX,
      height: bottom - top + padTop + padBottom,
      place: (blockLeft, blockTop) => {
        for (const n of nodes) {
          const x = blockLeft + padX + n.x - left;
          const y = blockTop + padTop + n.y - top;
          const block = blocks.get(n.id);
          if (block) block.place(x - n.width / 2, y - n.height / 2);
          else placed.set(n.id, { x, y, width: n.width, height: n.height });
        }
      },
    };
  }

  layOut(null).place(0, 0);
  return placed;
}

// dagre orders nodes within a rank to minimize edge crossings and ignores
// premise order, so swap same-rank premises' x slots back into saved order.
// All clause nodes share one width, so exchanging slots can't cause overlap.
// Swaps stay within one frame so no clause gets pulled out of its frame.
function orderPremisesLeftToRight(
  placed: Map<string, Placed>,
  argumentsList: ArgumentData[],
  containerOf: Map<string, string | null>,
) {
  for (const argument of argumentsList) {
    const bySlot = new Map<string, Placed[]>();
    for (const premise of argument.premises) {
      const node = placed.get(premise.clauseId)!;
      const key = `${node.y}|${containerOf.get(premise.clauseId) ?? ""}`;
      bySlot.set(key, [...(bySlot.get(key) ?? []), node]);
    }
    for (const slotNodes of bySlot.values()) {
      const slots = slotNodes.map((n) => n.x).sort((a, b) => a - b);
      slotNodes.forEach((n, i) => (n.x = slots[i]));
    }
  }
}

// dagre re-sorts a row whenever a category opens, so an opened category can jump
// past its neighbors. Working from the innermost categories outward: re-pack each
// container's sub-categories in a fixed (alphabetical) order, moving each one's
// whole contents with it, then size the container's frame around wherever its
// contents ended up, so the next level out packs using the real sizes. Containers
// that also hold loose clauses keep dagre's arrangement so nothing lands on them.
function arrangeCategories(
  placed: Map<string, Placed>,
  clauses: ClauseData[],
  openPaths: Set<string>,
  foldedPaths: string[],
) {
  const frames = new Map<string, Box>();
  const nodeBox = (id: string): Box => {
    const n = placed.get(id)!;
    return { left: n.x - n.width / 2, top: n.y - n.height / 2, right: n.x + n.width / 2, bottom: n.y + n.height / 2 };
  };
  const boxOf = (path: string) => frames.get(path) ?? nodeBox(groupNodeId(path));
  const shift = (path: string, dx: number) => {
    for (const p of openPaths) {
      if (!within(p, path)) continue;
      const f = frames.get(p);
      if (f) frames.set(p, { ...f, left: f.left + dx, right: f.right + dx });
    }
    for (const p of foldedPaths) if (within(p, path)) placed.get(groupNodeId(p))!.x += dx;
    for (const c of clauses) if (c.category !== null && within(c.category, path)) placed.get(c.id)!.x += dx;
  };

  const depth = (p: string | null) => (p === null ? 0 : p.split("/").length);
  const containers = [...openPaths, null].sort((a, b) => depth(b) - depth(a));
  for (const container of containers) {
    const children = [...openPaths, ...foldedPaths].filter((p) => parentPath(p) === container).sort();
    const loose = clauses.filter((c) => c.category === container);

    if (loose.length === 0 && children.length >= 2) {
      let cursor = Math.min(...children.map((p) => boxOf(p).left));
      for (const p of children) {
        const box = boxOf(p);
        shift(p, cursor - box.left);
        cursor += box.right - box.left + SIBLING_GAP;
      }
    }

    if (container === null) continue;
    const parts = [...loose.map((c) => nodeBox(c.id)), ...children.map(boxOf)];
    frames.set(container, {
      left: Math.min(...parts.map((b) => b.left)) - FRAME_PADDING,
      right: Math.max(...parts.map((b) => b.right)) + FRAME_PADDING,
      top: Math.min(...parts.map((b) => b.top)) - FRAME_PADDING - FRAME_HEADER,
      bottom: Math.max(...parts.map((b) => b.bottom)) + FRAME_PADDING,
    });
  }
  return frames;
}

// Centers for every clause and folded-category node on the map, plus a frame for
// every open category that still contains something visible.
export function layoutMap(
  clauses: ClauseData[],
  argumentsList: ArgumentData[],
  foldedPaths: string[],
  heights: Map<string, number>,
) {
  const openPaths = new Set<string>();
  for (const clause of clauses) {
    if (clause.category) for (const p of prefixes(clause.category)) openPaths.add(p);
  }
  for (const folded of foldedPaths) {
    for (const p of prefixes(folded)) if (p !== folded) openPaths.add(p);
  }

  const links = argumentsList.flatMap((a) => a.premises.map((p) => [p.clauseId, a.conclusionId] as [string, string]));
  const placed = placeNested(clauses, links, openPaths, foldedPaths, heights);
  const containerOf = new Map<string, string | null>([
    ...clauses.map((c) => [c.id, c.category] as const),
    ...foldedPaths.map((p) => [groupNodeId(p), parentPath(p)] as const),
  ]);
  orderPremisesLeftToRight(placed, argumentsList, containerOf);
  const frames = arrangeCategories(placed, clauses, openPaths, foldedPaths);
  return { placed, frames };
}
