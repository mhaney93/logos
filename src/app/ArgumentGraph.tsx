"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ControlButton,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { ClauseSupportSidebar } from "./clauses/ClauseSupportSidebar";
import {
  allCategoryPaths,
  categoryName,
  clauseCounts,
  clusterId,
  collapseCategories,
  collapsedAncestor,
  groupNodeId,
  parentPath,
  prefixes,
  type ArgumentData,
  type ClauseData,
} from "./graphGroups";

const CLAUSE_WIDTH = 240;
const CLAUSE_PADDING = 20; // 10px top + 10px bottom
const CLAUSE_CHARS_PER_LINE = 32; // rough fit for 240px width at 12px font
const CLAUSE_LINE_HEIGHT = 16;
const CLAUSE_MIN_HEIGHT = 56;
const FRAME_HEADER = 30;

function estimateClauseHeight(text: string) {
  const lines = Math.max(1, Math.ceil(text.length / CLAUSE_CHARS_PER_LINE));
  return Math.max(CLAUSE_MIN_HEIGHT, CLAUSE_PADDING + lines * CLAUSE_LINE_HEIGHT);
}

type ClauseNodeData = { label: string; accent?: string };
type GroupNodeData = { path: string; count: number; accent: string; onToggle: () => void };
type FrameNodeData = { path: string; accent: string; onToggle: () => void };

function ClauseNode({ data }: NodeProps<Node<ClauseNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <span className="nodrag nopan clause-node-text">{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

function GroupNode({ data }: NodeProps<Node<GroupNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <button
        type="button"
        onClick={data.onToggle}
        className="nodrag nopan flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[10px] text-xs"
        style={{ border: `2px solid ${data.accent}`, background: `color-mix(in srgb, ${data.accent} 15%, var(--background))` }}
      >
        <span className="font-semibold">{categoryName(data.path)} ▸</span>
        <span className="opacity-70">
          {data.count} clause{data.count === 1 ? "" : "s"} — click to expand
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

function FrameNode({ data }: NodeProps<Node<FrameNodeData>>) {
  return (
    <div
      className="flex h-full w-full justify-center rounded-2xl"
      style={{ border: `1px dashed ${data.accent}`, background: `color-mix(in srgb, ${data.accent} 6%, transparent)` }}
    >
      {/* Centered so the name lands where the folded node's name was. */}
      <button
        type="button"
        onClick={data.onToggle}
        className="nodrag nopan m-1.5 self-start rounded-full px-3 py-0.5 text-xs font-semibold"
        style={{ pointerEvents: "auto", background: `color-mix(in srgb, ${data.accent} 20%, var(--background))` }}
      >
        {categoryName(data.path)} ▾ collapse
      </button>
    </div>
  );
}

const nodeTypes = { clause: ClauseNode, group: GroupNode, frame: FrameNode };

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      {exit ? (
        <path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" />
      ) : (
        <path d="M3 9V3h6M21 9V3h-6M3 15v6h6M21 15v6h-6" />
      )}
    </svg>
  );
}

// Golden-angle hue steps keep neighboring arguments' colors far apart
// no matter how many arguments exist.
function hueColor(index: number) {
  return `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
}

// dagre orders nodes within a rank to minimize edge crossings and ignores
// premise order, so swap same-rank premises' x slots back into saved order.
// All clause nodes share one width, so exchanging slots can't cause overlap.
// Swaps stay within one frame so no clause gets pulled out of its frame.
function orderPremisesLeftToRight(graph: dagre.graphlib.Graph, argumentsList: ArgumentData[]) {
  for (const argument of argumentsList) {
    const bySlot = new Map<string, { x: number }[]>();
    for (const premise of argument.premises) {
      const node = graph.node(premise.clauseId);
      const key = `${node.y}|${graph.parent(premise.clauseId) ?? ""}`;
      bySlot.set(key, [...(bySlot.get(key) ?? []), node]);
    }
    for (const slotNodes of bySlot.values()) {
      const slots = slotNodes.map((n) => n.x).sort((a, b) => a - b);
      slotNodes.forEach((n, i) => (n.x = slots[i]));
    }
  }
}

function buildLayout(
  allClauses: ClauseData[],
  allArguments: ArgumentData[],
  collapsed: Set<string>,
  toggleCategory: (path: string) => void,
) {
  const paths = allCategoryPaths(allClauses);
  const color = new Map(paths.map((p, i) => [p, hueColor(i + 3)]));
  const counts = clauseCounts(allClauses);
  const { clauses, foldedPaths, arguments: argumentsList } = collapseCategories(
    allClauses,
    allArguments,
    collapsed,
  );

  // Every open category that still contains something visible gets a frame.
  const openPaths = new Set<string>();
  for (const clause of clauses) {
    if (clause.category) for (const p of prefixes(clause.category)) openPaths.add(p);
  }
  for (const folded of foldedPaths) {
    for (const p of prefixes(folded)) if (p !== folded) openPaths.add(p);
  }
  // A frame's header sits above any frames nested inside it, so it needs one
  // header's height per nested level to stay clear of theirs.
  const nestedLevels = new Map<string, number>();
  for (const p of [...openPaths].sort((a, b) => b.split("/").length - a.split("/").length)) {
    const parent = parentPath(p);
    if (parent) nestedLevels.set(parent, Math.max(nestedLevels.get(parent) ?? 0, (nestedLevels.get(p) ?? 0) + 1));
  }

  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 110 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const p of openPaths) graph.setNode(clusterId(p), {});
  for (const p of openPaths) {
    const parent = parentPath(p);
    if (parent) graph.setParent(clusterId(p), clusterId(parent));
  }
  const heights = new Map(clauses.map((c) => [c.id, estimateClauseHeight(c.text)]));
  for (const clause of clauses) {
    graph.setNode(clause.id, { width: CLAUSE_WIDTH, height: heights.get(clause.id) });
    if (clause.category) graph.setParent(clause.id, clusterId(clause.category));
  }
  for (const folded of foldedPaths) {
    graph.setNode(groupNodeId(folded), { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT });
    const parent = parentPath(folded);
    if (parent) graph.setParent(groupNodeId(folded), clusterId(parent));
  }

  const edgeKeys = new Set<string>();
  const edges: Edge[] = [];
  argumentsList.forEach((argument, index) => {
    // argumentsList is newest-first; count from the oldest so adding an
    // argument doesn't recolor the existing ones.
    const edgeColor = hueColor(argumentsList.length - 1 - index);
    for (const premise of argument.premises) {
      const key = `${premise.clauseId}->${argument.conclusionId}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      graph.setEdge(premise.clauseId, argument.conclusionId);
      edges.push({
        id: `e-${argument.id}-${premise.clauseId}`,
        source: premise.clauseId,
        target: argument.conclusionId,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2, opacity: 0.85 },
      });
    }
  });

  dagre.layout(graph);
  orderPremisesLeftToRight(graph, argumentsList);

  const frames: Node<FrameNodeData>[] = [...openPaths].flatMap((p) => {
    const box = graph.node(clusterId(p));
    if (!box?.width) return [];
    const header = FRAME_HEADER * ((nestedLevels.get(p) ?? 0) + 1);
    return [{
      id: clusterId(p),
      type: "frame",
      position: { x: box.x - box.width / 2, y: box.y - box.height / 2 - header },
      data: { path: p, accent: color.get(p)!, onToggle: () => toggleCategory(p) },
      style: { width: box.width, height: box.height + header, pointerEvents: "none" as const },
      // Outer frames render beneath the frames nested inside them.
      zIndex: -100 + p.split("/").length,
      selectable: false,
    }];
  });

  const groupNodes: Node<GroupNodeData>[] = foldedPaths.map((p) => {
    const pos = graph.node(groupNodeId(p));
    return {
      id: groupNodeId(p),
      type: "group",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - CLAUSE_MIN_HEIGHT / 2 },
      data: { path: p, count: counts.get(p) ?? 0, accent: color.get(p)!, onToggle: () => toggleCategory(p) },
      style: { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT, pointerEvents: "auto" as const },
    };
  });

  const clauseNodes: Node<ClauseNodeData>[] = clauses.map((clause) => {
    const pos = graph.node(clause.id);
    const height = heights.get(clause.id)!;
    return {
      id: clause.id,
      type: "clause",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - height / 2 },
      data: { label: clause.text, accent: clause.category ? color.get(clause.category) : undefined },
      // RF sets pointer-events: none on nodes when nothing RF-interactive
      // (drag/connect/select) is enabled — re-enable so text is clickable.
      style: { width: CLAUSE_WIDTH, minHeight: height, pointerEvents: "auto" as const },
    };
  });

  return { frames, groupNodes, clauseNodes, edges };
}

function clauseNodeStyle(matchState: "match" | "dim" | "normal", accent?: string) {
  const base = {
    padding: 10,
    borderRadius: 10,
    fontSize: 12,
    lineHeight: 1.3,
    textAlign: "center" as const,
    background: "var(--background)",
  };
  if (matchState === "match") {
    return { ...base, border: "2px solid #f59e0b", boxShadow: "0 0 0 3px rgba(245,158,11,0.25)" };
  }
  return {
    ...base,
    border: accent ? `2px solid ${accent}` : "1px solid color-mix(in srgb, currentColor 15%, transparent)",
    opacity: matchState === "dim" ? 0.3 : 1,
  };
}

function highlightStyle(matchState: "match" | "dim" | "normal", radius: number) {
  if (matchState === "match") return { borderRadius: radius, boxShadow: "0 0 0 3px #f59e0b" };
  return { opacity: matchState === "dim" ? 0.3 : 1 };
}

function GraphInner({
  clauses,
  arguments: argumentsList,
}: {
  clauses: ClauseData[];
  arguments: ArgumentData[];
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { setCenter, fitView, getViewport, setViewport } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allPaths = useMemo(() => allCategoryPaths(clauses), [clauses]);
  // Everything starts folded to the top-level branches, like an outline.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(allPaths));

  // Relayout moves everything, so shift the camera by however far the clicked
  // category moved: it stays put on screen and its neighbors make room around it.
  const toggleCategory = useCallback(
    (path: string) => {
      const next = new Set(collapsed);
      if (next.has(path)) next.delete(path);
      else next.add(path);

      const anchor = (folded: Set<string>) => {
        const { frames, groupNodes } = buildLayout(clauses, argumentsList, folded, () => {});
        const id = folded.has(path) ? groupNodeId(path) : clusterId(path);
        const node = [...frames, ...groupNodes].find((n) => n.id === id);
        if (!node) return null;
        return { x: node.position.x + Number(node.style?.width ?? CLAUSE_WIDTH) / 2, y: node.position.y };
      };
      const before = anchor(collapsed);
      const after = anchor(next);
      if (before && after) {
        const { x, y, zoom } = getViewport();
        setViewport({ x: x - (after.x - before.x) * zoom, y: y - (after.y - before.y) * zoom, zoom });
      }
      setCollapsed(next);
    },
    [collapsed, clauses, argumentsList, getViewport, setViewport],
  );

  useEffect(() => {
    function onChange() {
      setIsFullscreen(document.fullscreenElement === wrapperRef.current);
      // Wait a frame for the container to resize before refitting.
      requestAnimationFrame(() => fitView());
    }
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [fitView]);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else wrapperRef.current?.requestFullscreen();
  }

  const layout = useMemo(
    () => buildLayout(clauses, argumentsList, collapsed, toggleCategory),
    [clauses, argumentsList, collapsed, toggleCategory],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const matchingClauses = useMemo(
    () => (trimmedQuery ? clauses.filter((c) => c.text.toLowerCase().includes(trimmedQuery)) : []),
    [clauses, trimmedQuery],
  );
  // Category names aren't clause text, so they're matched separately.
  const matchingPaths = useMemo(
    () => (trimmedQuery ? allPaths.filter((p) => categoryName(p).toLowerCase().includes(trimmedQuery)) : []),
    [allPaths, trimmedQuery],
  );

  const nodes = useMemo(() => {
    const clauseHits = new Set(matchingClauses.map((c) => c.id));
    // A hit inside a folded category lights up the node standing in for it.
    const groupHits = new Set<string>();
    for (const c of matchingClauses) {
      const folded = collapsedAncestor(c.category, collapsed);
      if (folded) groupHits.add(folded);
    }
    for (const p of matchingPaths) groupHits.add(collapsedAncestor(p, collapsed) ?? p);
    const state = (hit: boolean) => (!trimmedQuery ? "normal" : hit ? "match" : "dim");
    return [
      ...layout.frames.map((n) =>
        groupHits.has(n.data.path) ? { ...n, style: { ...n.style, ...highlightStyle("match", 16) } } : n,
      ),
      ...layout.groupNodes.map((n) => ({
        ...n,
        style: { ...n.style, ...highlightStyle(state(groupHits.has(n.data.path)), 12) },
      })),
      ...layout.clauseNodes.map((n) => ({
        ...n,
        style: { ...n.style, ...clauseNodeStyle(state(clauseHits.has(n.id)), n.data.accent) },
      })),
    ] as Node[];
  }, [layout, matchingClauses, matchingPaths, collapsed, trimmedQuery]);

  function centerOn(node: Node | undefined) {
    if (!node) return;
    const style = node.style as { width?: number; height?: number; minHeight?: number };
    const width = Number(style.width ?? CLAUSE_WIDTH);
    const height = Number(style.height ?? style.minHeight ?? CLAUSE_MIN_HEIGHT);
    // Frames can be wider than the viewport, so zoom out enough to show them whole.
    const zoom = node.type === "frame" ? Math.min(1, 900 / width) : 1;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom, duration: 400 });
  }

  // Unfold just enough to reveal the target, then center on it. Layout is
  // deterministic, so its position can be computed now instead of after re-render.
  function reveal(next: Set<string>, nodeId: string) {
    setCollapsed(next);
    const revealed = buildLayout(clauses, argumentsList, next, () => {});
    centerOn([...revealed.groupNodes, ...revealed.clauseNodes].find((n) => n.id === nodeId));
  }

  function focusFirstMatch() {
    const path = matchingPaths[0];
    if (path) {
      const next = new Set(collapsed);
      for (const p of prefixes(path)) next.delete(p);
      next.add(path);
      reveal(next, groupNodeId(path));
      return;
    }
    const clause = matchingClauses[0];
    if (!clause) return;
    const next = new Set(collapsed);
    for (const p of clause.category ? prefixes(clause.category) : []) next.delete(p);
    reveal(next, clause.id);
  }

  const selected = clauses.find((c) => c.id === selectedId) ?? null;

  return (
    <div
      ref={wrapperRef}
      className={`flex min-h-0 flex-1 flex-col gap-3 ${isFullscreen ? "h-screen bg-background p-4" : ""}`}
    >
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") focusFirstMatch();
          }}
          placeholder="Search clauses or categories…"
          className="min-w-0 flex-1 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        />
        {trimmedQuery && (
          <p className="shrink-0 text-xs text-zinc-500">
            {matchingPaths.length > 0 &&
              `${matchingPaths.length} categor${matchingPaths.length === 1 ? "y" : "ies"}, `}
            {matchingClauses.length} clause{matchingClauses.length === 1 ? "" : "s"} — Enter to jump
          </p>
        )}
      </div>
      <div className="relative min-h-[400px] w-full flex-1 overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        {/* RF sizes itself to 100% of its parent, which a flex-stretched height can't
            resolve — pin it to the container instead. */}
        <ReactFlow
          className="!absolute inset-0"
          nodes={nodes}
          edges={layout.edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={false}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            if (node.type !== "clause") return;
            // Skip if the click was the tail end of a text-selection drag.
            if (window.getSelection()?.toString()) return;
            setSelectedId(node.id);
          }}
        >
          <Controls showInteractive={false}>
            <ControlButton onClick={() => setCollapsed(new Set())} title="Expand all categories" aria-label="Expand all categories">
              <span className="text-base font-bold leading-none">+</span>
            </ControlButton>
            <ControlButton onClick={() => setCollapsed(new Set(allPaths))} title="Collapse all categories" aria-label="Collapse all categories">
              <span className="text-base font-bold leading-none">−</span>
            </ControlButton>
            <ControlButton
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FullscreenIcon exit={isFullscreen} />
            </ControlButton>
          </Controls>
        </ReactFlow>
      </div>

      {selected && (
        <ClauseSupportSidebar
          key={selected.id}
          id={selected.id}
          text={selected.text}
          support={selected.support}
          category={selected.category}
          categories={allPaths}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

export function ArgumentGraph({
  clauses,
  arguments: argumentsList,
}: {
  clauses: ClauseData[];
  arguments: ArgumentData[];
}) {
  if (clauses.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500">
        No clauses yet — be the first to publish one.
      </p>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphInner clauses={clauses} arguments={argumentsList} />
    </ReactFlowProvider>
  );
}
