"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ControlButton,
  Controls,
  Handle,
  MarkerType,
  Panel,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ClauseSupportSidebar } from "./ClauseSupportSidebar";
import { afterPaint } from "./afterPaint";
import { SearchBox } from "./SearchBox";
import { normalizeQuery, searchMatches, type SearchMatch } from "./search";
import { NoteBadges } from "./components/NoteBadges";
import { noteKinds, type NoteKind } from "@/lib/notes";
import { EDGE_HIT_WIDTH, edgeEmphasis } from "@/lib/edges";
import { CLAUSE_MIN_HEIGHT, CLAUSE_WIDTH, layoutMap } from "./graphLayout";
import {
  allCategoryPaths,
  categoryName,
  clauseCounts,
  clusterId,
  collapseCategories,
  conclusionsByPremise,
  collapsedAncestor,
  groupNodeId,
  premiseChain,
  premisesByConclusion,
  prefixes,
  visibleChains,
  type ArgumentData,
  type ClauseData,
  type GraphView,
} from "./graphGroups";

const CLAUSE_PADDING = 20; // 10px top + 10px bottom
const CLAUSE_CHARS_PER_LINE = 32; // rough fit for 240px width at 12px font
const CLAUSE_LINE_HEIGHT = 16;

function estimateClauseHeight(text: string) {
  const lines = Math.max(1, Math.ceil(text.length / CLAUSE_CHARS_PER_LINE));
  return Math.max(CLAUSE_MIN_HEIGHT, CLAUSE_PADDING + lines * CLAUSE_LINE_HEIGHT);
}

type ClauseNodeData = {
  label: string;
  accent?: string;
  notes: NoteKind[];
  hasPremises: boolean;
  open: boolean;
  onToggleChain: () => void;
  hasConclusions: boolean;
  below: boolean;
  onToggleBelow: () => void;
};
type GroupNodeData = { path: string; count: number; accent: string; onToggle: () => void };
type FrameNodeData = { path: string; accent: string; onToggle: () => void };

function ChainDot({ filled, label, onClick, className }: { filled: boolean; label: string; onClick: () => void; className: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      aria-label={label}
      className={`nodrag nopan absolute left-1/2 z-10 h-4 w-4 -translate-x-1/2 cursor-pointer ${className}`}
      style={{ pointerEvents: "auto" }}
    >
      {/* SVG fill, unlike a CSS background, survives dark-mode extensions recoloring it. */}
      <svg viewBox="0 0 16 16" className="h-full w-full">
        <circle cx="8" cy="8" r="6.5" strokeWidth="2" stroke="currentColor" fill={filled ? "currentColor" : "var(--background)"} />
      </svg>
    </button>
  );
}

function ClauseNode({ data }: NodeProps<Node<ClauseNodeData>>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      {data.hasPremises && (
        <ChainDot
          filled={data.open}
          label={data.open ? "Hide premises" : "Show premises"}
          onClick={data.onToggleChain}
          className="-top-2"
        />
      )}
      <span className="nodrag nopan clause-node-text">{data.label}</span>
      <NoteBadges kinds={data.notes} className="absolute -top-2 right-2" />
      {data.hasConclusions && (
        <ChainDot
          filled={data.below}
          label={data.below ? "Hide conclusions" : "Show conclusions"}
          onClick={data.onToggleBelow}
          className="-bottom-2"
        />
      )}
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

// Spun by a transform so the compositor keeps it turning while layout blocks the main thread.
function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

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

function buildLayout(
  allClauses: ClauseData[],
  allArguments: ArgumentData[],
  view: GraphView,
  toggleCategory: (path: string) => void,
  toggleChain: (id: string) => void,
  toggleBelow: (id: string) => void,
) {
  const paths = allCategoryPaths(allClauses);
  const color = new Map(paths.map((p, i) => [p, hueColor(i + 3)]));
  const counts = clauseCounts(allClauses);
  const premisesOf = premisesByConclusion(allArguments);
  const conclusionsOf = conclusionsByPremise(allArguments);
  // allArguments is newest-first; count from the oldest so adding an argument,
  // or opening a chain, doesn't recolor the existing ones.
  const argumentColor = new Map(allArguments.map((a, i) => [a.id, hueColor(allArguments.length - 1 - i)]));
  const shown = visibleChains(allClauses, allArguments, view);
  const { clauses, foldedPaths, arguments: argumentsList } = collapseCategories(
    shown.clauses,
    shown.arguments,
    view.collapsed,
  );

  const heights = new Map(clauses.map((c) => [c.id, estimateClauseHeight(c.text)]));
  const edgeKeys = new Set<string>();
  const edges: Edge[] = [];
  argumentsList.forEach((argument) => {
    const edgeColor = argumentColor.get(argument.id)!;
    for (const premise of argument.premises) {
      const key = `${premise.clauseId}->${argument.conclusionId}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({
        id: `e-${argument.id}-${premise.clauseId}`,
        source: premise.clauseId,
        target: argument.conclusionId,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2, opacity: 0.85 },
        interactionWidth: EDGE_HIT_WIDTH,
      });
    }
  });

  const { placed, frames: frameBoxes } = layoutMap(clauses, argumentsList, foldedPaths, heights);

  const frames: Node<FrameNodeData>[] = [...frameBoxes].map(([p, box]) => {
    return {
      id: clusterId(p),
      type: "frame",
      position: { x: box.left, y: box.top },
      data: { path: p, accent: color.get(p)!, onToggle: () => toggleCategory(p) },
      style: { width: box.right - box.left, height: box.bottom - box.top, pointerEvents: "none" as const },
      // Outer frames render beneath the frames nested inside them.
      zIndex: -100 + p.split("/").length,
      selectable: false,
    };
  });

  const groupNodes: Node<GroupNodeData>[] = foldedPaths.map((p) => {
    const pos = placed.get(groupNodeId(p))!;
    return {
      id: groupNodeId(p),
      type: "group",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - CLAUSE_MIN_HEIGHT / 2 },
      data: { path: p, count: counts.get(p) ?? 0, accent: color.get(p)!, onToggle: () => toggleCategory(p) },
      style: { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT, pointerEvents: "auto" as const },
    };
  });

  const clauseNodes: Node<ClauseNodeData>[] = clauses.map((clause) => {
    const pos = placed.get(clause.id)!;
    const height = heights.get(clause.id)!;
    return {
      id: clause.id,
      type: "clause",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - height / 2 },
      data: {
        label: clause.text,
        accent: clause.category ? color.get(clause.category) : undefined,
        notes: noteKinds(clause.support),
        hasPremises: premisesOf.has(clause.id),
        open: view.open.has(clause.id),
        onToggleChain: () => toggleChain(clause.id),
        hasConclusions: conclusionsOf.has(clause.id),
        below: view.below.has(clause.id),
        onToggleBelow: () => toggleBelow(clause.id),
      },
      // RF sets pointer-events: none on nodes when nothing RF-interactive
      // (drag/connect/select) is enabled — re-enable so text is clickable.
      style: { width: CLAUSE_WIDTH, minHeight: height, pointerEvents: "auto" as const },
    };
  });

  return { frames, groupNodes, clauseNodes, edges };
}

type MatchState = "match" | "premise" | "dim" | "normal";

function clauseNodeStyle(matchState: MatchState, accent?: string) {
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
  if (matchState === "premise") return { ...base, border: "2px dashed #f59e0b" };
  return {
    ...base,
    border: accent ? `2px solid ${accent}` : "1px solid color-mix(in srgb, currentColor 15%, transparent)",
    opacity: matchState === "dim" ? 0.3 : 1,
  };
}

function highlightStyle(matchState: MatchState, radius: number) {
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
  const [boldEdgeId, setBoldEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const { setCenter, fitView, getViewport, setViewport } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allPaths = useMemo(() => allCategoryPaths(clauses), [clauses]);
  const premisesOf = useMemo(() => premisesByConclusion(argumentsList), [argumentsList]);
  const conclusionsOf = useMemo(() => conclusionsByPremise(argumentsList), [argumentsList]);
  // Home: everything folded to the top-level branches, like an outline.
  const homeView = useCallback(
    (): GraphView => ({ collapsed: new Set(allPaths), open: new Set(), pinned: new Set(), below: new Set() }),
    [allPaths],
  );
  const [view, setView] = useState<GraphView>(homeView);
  const { collapsed } = view;
  const showingAll = collapsed.size === 0 && [...premisesOf.keys()].every((id) => view.open.has(id));

  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  // Laying out the whole map can block for seconds, so paint the busy state first
  // and only clear it once the new layout has rendered.
  function toggleShowAll() {
    if (busyLabel) return;
    const next = showingAll
      ? homeView()
      : { collapsed: new Set<string>(), open: new Set(premisesOf.keys()), pinned: new Set<string>(), below: new Set(conclusionsOf.keys()) };
    setBusyLabel(showingAll ? "Collapsing…" : "Expanding…");
    afterPaint(() => {
      setView(next);
      afterPaint(() => {
        fitView();
        setBusyLabel(null);
      });
    });
  }

  const nodeIn = useCallback(
    (v: GraphView, id: string) => {
      const { frames, groupNodes, clauseNodes } = buildLayout(clauses, argumentsList, v, () => {}, () => {}, () => {});
      return [...frames, ...groupNodes, ...clauseNodes].find((n) => n.id === id);
    },
    [clauses, argumentsList],
  );

  // Relayout moves everything, so shift the camera by however far the clicked
  // node moved: it stays put on screen and its neighbors make room around it.
  const changeViewAround = useCallback(
    (next: GraphView, idBefore: string, idAfter: string) => {
      const anchor = (v: GraphView, id: string) => {
        const node = nodeIn(v, id);
        if (!node) return null;
        return { x: node.position.x + Number(node.style?.width ?? CLAUSE_WIDTH) / 2, y: node.position.y };
      };
      const before = anchor(view, idBefore);
      const after = anchor(next, idAfter);
      if (before && after) {
        const { x, y, zoom } = getViewport();
        setViewport({ x: x - (after.x - before.x) * zoom, y: y - (after.y - before.y) * zoom, zoom });
      }
      setView(next);
    },
    [view, nodeIn, getViewport, setViewport],
  );

  const toggleCategory = useCallback(
    (path: string) => {
      const next = new Set(collapsed);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      const idFor = (folded: Set<string>) => (folded.has(path) ? groupNodeId(path) : clusterId(path));
      changeViewAround({ ...view, collapsed: next }, idFor(collapsed), idFor(next));
    },
    [view, collapsed, changeViewAround],
  );

  // A dot opens one level of premises; a search match opens its whole chain. Either
  // way, any category the newly shown clauses sit in unfolds. Closing a clause closes
  // everything above it, so reopening starts from a clean slate.
  const openChain = useCallback(
    (v: GraphView, id: string, wholeChain: boolean) => {
      const opening = wholeChain ? [id, ...premiseChain([id], premisesOf)] : [id];
      const revealed = new Set([...opening, ...opening.flatMap((c) => premisesOf.get(c) ?? [])]);
      const unfolded = new Set(v.collapsed);
      for (const c of clauses.filter((c) => revealed.has(c.id))) {
        for (const p of c.category ? prefixes(c.category) : []) unfolded.delete(p);
      }
      return { ...v, collapsed: unfolded, open: new Set([...v.open, ...opening]) };
    },
    [clauses, premisesOf],
  );

  const toggleChain = useCallback(
    (id: string) => {
      let next: GraphView;
      if (view.open.has(id)) {
        const closing = new Set([id, ...premiseChain([id], premisesOf)]);
        next = { ...view, open: new Set([...view.open].filter((c) => !closing.has(c))) };
      } else {
        next = openChain(view, id, false);
      }
      changeViewAround(next, id, id);
    },
    [view, premisesOf, openChain, changeViewAround],
  );

  // The bottom dot mirrors the top one: it shows the arguments this clause is a premise
  // in, one level down. Closing it closes everything below.
  const toggleBelow = useCallback(
    (id: string) => {
      let next: GraphView;
      if (view.below.has(id)) {
        const closing = premiseChain([id], conclusionsOf);
        const keep = (c: string) => !closing.has(c);
        next = {
          ...view,
          open: new Set([...view.open].filter(keep)),
          pinned: new Set([...view.pinned].filter(keep)),
          below: new Set([...view.below].filter((c) => c !== id && keep(c))),
        };
      } else {
        const conclusions = conclusionsOf.get(id) ?? [];
        next = conclusions.reduce((v, c) => openChain(v, c, false), view);
        next = { ...next, pinned: new Set([...next.pinned, ...conclusions]), below: new Set([...next.below, id]) };
      }
      changeViewAround(next, id, id);
    },
    [view, conclusionsOf, openChain, changeViewAround],
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
    () => buildLayout(clauses, argumentsList, view, toggleCategory, toggleChain, toggleBelow),
    [clauses, argumentsList, view, toggleCategory, toggleChain, toggleBelow],
  );

  const edges = useMemo(
    () =>
      layout.edges.map((e) => {
        const emphasis = edgeEmphasis(e.style ?? {}, { bold: e.id === boldEdgeId, hovered: e.id === hoveredEdgeId });
        return emphasis ? { ...e, ...emphasis } : e;
      }),
    [layout.edges, boldEdgeId, hoveredEdgeId],
  );

  // Typing stays instant while matching and re-highlighting the whole map catch up.
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = normalizeQuery(deferredQuery);
  const matches = useMemo(() => searchMatches(clauses, allPaths, deferredQuery), [clauses, allPaths, deferredQuery]);
  const matchesFor = useCallback((q: string) => searchMatches(clauses, allPaths, q), [clauses, allPaths]);
  const matchingClauses = useMemo(
    () => matches.flatMap((m) => (m.kind === "clause" ? [m.clause] : [])),
    [matches],
  );
  const matchingPremises = useMemo(
    () => premiseChain(matchingClauses.map((c) => c.id), premisesOf),
    [premisesOf, matchingClauses],
  );
  const matchingPaths = useMemo(() => matches.flatMap((m) => (m.kind === "category" ? [m.path] : [])), [matches]);

  const nodes = useMemo(() => {
    const clauseHits = new Set(matchingClauses.map((c) => c.id));
    // A hit inside a folded category lights up the node standing in for it.
    const groupHits = new Set<string>();
    for (const c of clauses.filter((c) => clauseHits.has(c.id) || matchingPremises.has(c.id))) {
      const folded = collapsedAncestor(c.category, collapsed);
      if (folded) groupHits.add(folded);
    }
    for (const p of matchingPaths) groupHits.add(collapsedAncestor(p, collapsed) ?? p);
    const state = (hit: boolean): MatchState => (!trimmedQuery ? "normal" : hit ? "match" : "dim");
    const clauseState = (id: string): MatchState =>
      matchingPremises.has(id) && !clauseHits.has(id) ? "premise" : state(clauseHits.has(id));
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
        style: { ...n.style, ...clauseNodeStyle(clauseState(n.id), n.data.accent) },
      })),
    ] as Node[];
  }, [layout, clauses, matchingClauses, matchingPremises, matchingPaths, collapsed, trimmedQuery]);

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
  function reveal(next: GraphView, nodeId: string) {
    setView(next);
    centerOn(nodeIn(next, nodeId));
  }

  function focusMatch(match: SearchMatch) {
    if (match.kind === "category") {
      const next = new Set(collapsed);
      for (const p of prefixes(match.path)) next.delete(p);
      next.add(match.path);
      reveal({ ...view, collapsed: next }, groupNodeId(match.path));
      return;
    }
    const { clause } = match;
    // Open the clause's whole chain, but keep the camera on the clause.
    const next = openChain(view, clause.id, true);
    reveal({ ...next, pinned: new Set([...view.pinned, clause.id]) }, clause.id);
  }

  const selected = clauses.find((c) => c.id === selectedId) ?? null;

  return (
    <div
      ref={wrapperRef}
      className={`flex min-h-0 flex-1 flex-col gap-3 ${isFullscreen ? "h-screen bg-background p-4" : ""}`}
    >
      <div className="flex items-center gap-3">
        <SearchBox query={query} onQueryChange={setQuery} matches={matches} matchesQuery={deferredQuery} matchesFor={matchesFor} onPick={focusMatch} />
        {trimmedQuery && (
          <p className="shrink-0 text-xs text-zinc-500">
            {matchingPaths.length > 0 &&
              `${matchingPaths.length} categor${matchingPaths.length === 1 ? "y" : "ies"}, `}
            {matchingClauses.length} clause{matchingClauses.length === 1 ? "" : "s"} — ↓ to choose, Enter to jump
          </p>
        )}
      </div>
      <div className="relative min-h-[400px] w-full flex-1 overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        {/* RF sizes itself to 100% of its parent, which a flex-stretched height can't
            resolve — pin it to the container instead. */}
        <ReactFlow
          className="!absolute inset-0"
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={false}
          proOptions={{ hideAttribution: true }}
          onEdgeClick={(_, edge) => setBoldEdgeId((id) => (id === edge.id ? null : edge.id))}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onNodeClick={(_, node) => {
            if (node.type !== "clause") return;
            // Skip if the click was the tail end of a text-selection drag.
            if (window.getSelection()?.toString()) return;
            setSelectedId(node.id);
          }}
        >
          <Controls showInteractive={false}>
            <ControlButton
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              <FullscreenIcon exit={isFullscreen} />
            </ControlButton>
          </Controls>
          <Panel position="top-right">
            <button
              type="button"
              onClick={toggleShowAll}
              disabled={busyLabel !== null}
              aria-busy={busyLabel !== null}
              className="flex items-center gap-1.5 rounded-full border border-black/[.08] bg-background px-3 py-1 text-xs font-semibold shadow-sm disabled:cursor-wait dark:border-white/[.145]"
            >
              {busyLabel && <Spinner />}
              {busyLabel ?? (showingAll ? "Back to home" : "Expand all")}
            </button>
          </Panel>
        </ReactFlow>
        {busyLabel && (
          <div
            role="status"
            className="absolute inset-0 z-10 flex cursor-wait items-center justify-center bg-background/60"
          >
            <span className="flex items-center gap-2 rounded-full border border-black/[.08] bg-background px-4 py-2 text-sm font-semibold shadow-sm dark:border-white/[.145]">
              <Spinner />
              {busyLabel}
            </span>
          </div>
        )}
      </div>

      {selected && (
        <ClauseSupportSidebar
          key={selected.id}
          id={selected.id}
          text={selected.text}
          support={selected.support}
          category={selected.category}
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
