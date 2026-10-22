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
// dagre re-sorts a row whenever a category opens, so an opened category can jump
// past its neighbors: a container holding only sub-categories packs them side by
// side in a fixed (alphabetical) order before its own size is measured. Containers
// that also hold loose clauses keep dagre's arrangement so nothing lands on them.
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
  const nodeIdOf = (path: string) => (folded.has(path) ? groupNodeId(path) : clusterId(path));
  const memberIn = (id: string, container: string | null) => {
    const path = location.get(id);
    if (path === undefined) return null;
    if (path === container) return id;
    if (path === null || !within(path, container)) return null;
    return nodeIdOf(childOf(path, container));
  };

  const placed = new Map<string, Placed>();
  const frames = new Map<string, Box>();
  type Block = { width: number; height: number; place: (left: number, top: number) => void };

  function layOut(container: string | null): Block {
    const graph = new dagre.graphlib.Graph();
    graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 110 });
    graph.setDefaultEdgeLabel(() => ({}));
    const blocks = new Map<string, Block>();

    const loose = clauses.filter((c) => c.category === container);
    for (const c of loose) graph.setNode(c.id, { width: CLAUSE_WIDTH, height: heights.get(c.id)! });
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
    if (loose.length === 0 && children.length >= 2) {
      const byId = new Map(nodes.map((n) => [n.id, n]));
      let cursor = Math.min(...nodes.map((n) => n.x - n.width / 2));
      for (const p of children) {
        const n = byId.get(nodeIdOf(p))!;
        n.x = cursor + n.width / 2;
        cursor += n.width + SIBLING_GAP;
      }
    }
    const left = Math.min(...nodes.map((n) => n.x - n.width / 2));
    const top = Math.min(...nodes.map((n) => n.y - n.height / 2));
    const right = Math.max(...nodes.map((n) => n.x + n.width / 2));
    const bottom = Math.max(...nodes.map((n) => n.y + n.height / 2));
    const padX = container === null ? 0 : FRAME_PADDING;
    const padTop = container === null ? 0 : FRAME_PADDING + FRAME_HEADER;
    const padBottom = container === null ? 0 : FRAME_PADDING;
    const width = right - left + 2 * padX;
    const height = bottom - top + padTop + padBottom;
    return {
      width,
      height,
      place: (blockLeft, blockTop) => {
        if (container !== null) {
          frames.set(container, { left: blockLeft, top: blockTop, right: blockLeft + width, bottom: blockTop + height });
        }
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
  return { placed, frames };
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
  const { placed, frames } = placeNested(clauses, links, openPaths, foldedPaths, heights);
  const containerOf = new Map<string, string | null>([
    ...clauses.map((c) => [c.id, c.category] as const),
    ...foldedPaths.map((p) => [groupNodeId(p), parentPath(p)] as const),
  ]);
  orderPremisesLeftToRight(placed, argumentsList, containerOf);
  return { placed, frames };
}
