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
  clusterId,
  collapseGroups,
  groupMembership,
  groupNodeId,
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
type GroupNodeData = { label: string; count: number; accent: string; onToggle: () => void };
type FrameNodeData = { label: string; accent: string; onToggle: () => void };

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
        <span className="font-semibold">{data.label} ▸</span>
        <span className="opacity-70">
          {data.count} virtue{data.count === 1 ? "" : "s"} — click to expand
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

function FrameNode({ data }: NodeProps<Node<FrameNodeData>>) {
  return (
    <div
      className="h-full w-full rounded-2xl"
      style={{ border: `1px dashed ${data.accent}`, background: `color-mix(in srgb, ${data.accent} 7%, transparent)` }}
    >
      <button
        type="button"
        onClick={data.onToggle}
        className="nodrag nopan m-2 rounded-full px-3 py-0.5 text-xs font-semibold"
        style={{ pointerEvents: "auto", background: `color-mix(in srgb, ${data.accent} 20%, var(--background))` }}
      >
        {data.label} ▾ collapse
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
// Swaps stay within one group frame so no clause gets pulled out of its frame.
function orderPremisesLeftToRight(graph: dagre.graphlib.Graph, argumentsList: ArgumentData[]) {
  for (const argument of argumentsList) {
    const bySlotGroup = new Map<string, { x: number }[]>();
    for (const premise of argument.premises) {
      const node = graph.node(premise.clauseId);
      const key = `${node.y}|${graph.parent(premise.clauseId) ?? ""}`;
      bySlotGroup.set(key, [...(bySlotGroup.get(key) ?? []), node]);
    }
    for (const slotNodes of bySlotGroup.values()) {
      const slots = slotNodes.map((n) => n.x).sort((a, b) => a - b);
      slotNodes.forEach((n, i) => (n.x = slots[i]));
    }
  }
}

function buildLayout(
  allClauses: ClauseData[],
  allArguments: ArgumentData[],
  collapsed: Set<string>,
  toggleGroup: (group: string) => void,
) {
  const { membership, virtueCounts, groups } = groupMembership(allClauses, allArguments);
  const groupColor = new Map(groups.map((g, i) => [g, hueColor(i + 3)]));
  const { clauses, collapsedGroups, arguments: argumentsList } = collapseGroups(
    allClauses,
    allArguments,
    membership,
    collapsed,
  );

  const graph = new dagre.graphlib.Graph({ compound: true });
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 });
  graph.setDefaultEdgeLabel(() => ({}));

  const heights = new Map(clauses.map((c) => [c.id, estimateClauseHeight(c.text)]));
  const expandedGroups = groups.filter((g) => !collapsed.has(g));
  for (const group of expandedGroups) graph.setNode(clusterId(group), {});
  for (const clause of clauses) {
    graph.setNode(clause.id, { width: CLAUSE_WIDTH, height: heights.get(clause.id) });
    const group = membership.get(clause.id);
    if (group) graph.setParent(clause.id, clusterId(group));
  }
  for (const group of collapsedGroups) {
    graph.setNode(groupNodeId(group), { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT });
  }

  const edgeKeys = new Set<string>();
  const edges: Edge[] = [];
  argumentsList.forEach((argument, index) => {
    // argumentsList is newest-first; count from the oldest so adding an
    // argument doesn't recolor the existing ones.
    const color = hueColor(argumentsList.length - 1 - index);
    for (const premise of argument.premises) {
      const key = `${premise.clauseId}->${argument.conclusionId}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      graph.setEdge(premise.clauseId, argument.conclusionId);
      edges.push({
        id: `e-${argument.id}-${premise.clauseId}`,
        source: premise.clauseId,
        target: argument.conclusionId,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: 2, opacity: 0.85 },
      });
    }
  });

  dagre.layout(graph);
  orderPremisesLeftToRight(graph, argumentsList);

  const frames: Node[] = expandedGroups.flatMap((group) => {
    const box = graph.node(clusterId(group));
    if (!box?.width) return [];
    return [{
      id: clusterId(group),
      type: "frame",
      position: { x: box.x - box.width / 2, y: box.y - box.height / 2 - FRAME_HEADER },
      data: { label: group, accent: groupColor.get(group)!, onToggle: () => toggleGroup(group) },
      style: { width: box.width, height: box.height + FRAME_HEADER, pointerEvents: "none" as const },
      zIndex: -1,
      selectable: false,
    }];
  });

  const groupNodes: Node[] = collapsedGroups.map((group) => {
    const pos = graph.node(groupNodeId(group));
    return {
      id: groupNodeId(group),
      type: "group",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - CLAUSE_MIN_HEIGHT / 2 },
      data: {
        label: group,
        count: virtueCounts.get(group) ?? 0,
        accent: groupColor.get(group)!,
        onToggle: () => toggleGroup(group),
      },
      style: { width: CLAUSE_WIDTH, height: CLAUSE_MIN_HEIGHT, pointerEvents: "auto" as const },
    };
  });

  const clauseNodes: Node<ClauseNodeData>[] = clauses.map((clause) => {
    const pos = graph.node(clause.id);
    const height = heights.get(clause.id)!;
    const group = membership.get(clause.id);
    return {
      id: clause.id,
      type: "clause",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - height / 2 },
      data: { label: clause.text, accent: group ? groupColor.get(group) : undefined },
      // RF sets pointer-events: none on nodes when nothing RF-interactive
      // (drag/connect/select) is enabled — re-enable so text is clickable.
      style: { width: CLAUSE_WIDTH, minHeight: height, pointerEvents: "auto" as const },
    };
  });

  return { frames, groupNodes, clauseNodes, edges, membership, groups };
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

function groupNodeStyle(matchState: "match" | "dim" | "normal") {
  if (matchState === "match") return { borderRadius: 12, boxShadow: "0 0 0 3px #f59e0b" };
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
  const { setCenter, fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allGroups = useMemo(
    () => groupMembership(clauses, argumentsList).groups,
    [clauses, argumentsList],
  );
  // Groups start collapsed, like the outline they came from.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(allGroups));

  const toggleGroup = useCallback((group: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

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
    () => buildLayout(clauses, argumentsList, collapsed, toggleGroup),
    [clauses, argumentsList, collapsed, toggleGroup],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const matchingIds = useMemo(() => {
    if (!trimmedQuery) return [];
    return clauses.filter((c) => c.text.toLowerCase().includes(trimmedQuery)).map((c) => c.id);
  }, [clauses, trimmedQuery]);

  // Group names aren't clause text, so they're matched separately.
  const matchingGroups = useMemo(
    () => (trimmedQuery ? allGroups.filter((g) => g.toLowerCase().includes(trimmedQuery)) : []),
    [allGroups, trimmedQuery],
  );

  const nodes = useMemo(() => {
    const matches = new Set(matchingIds);
    const matchedGroups = new Set([
      ...matchingGroups,
      ...matchingIds.map((id) => layout.membership.get(id)).filter((g): g is string => !!g),
    ]);
    const state = (hit: boolean) => (!trimmedQuery ? "normal" : hit ? "match" : "dim");
    return [
      ...layout.frames.map((n) =>
        matchingGroups.includes(n.data.label as string)
          ? { ...n, style: { ...(n.style as object), borderRadius: 16, boxShadow: "0 0 0 3px #f59e0b" } }
          : n,
      ),
      ...layout.groupNodes.map((n) => ({
        ...n,
        style: { ...(n.style as object), ...groupNodeStyle(state(matchedGroups.has(n.data.label as string))) },
      })),
      ...layout.clauseNodes.map((n) => ({
        ...n,
        style: { ...(n.style as object), ...clauseNodeStyle(state(matches.has(n.id)), n.data.accent) },
      })),
    ];
  }, [layout, matchingIds, matchingGroups, trimmedQuery]);

  function centerOn(node: Node | undefined) {
    if (!node) return;
    const style = node.style as { width?: number; height?: number; minHeight?: number };
    const width = Number(style.width ?? CLAUSE_WIDTH);
    const height = Number(style.height ?? style.minHeight ?? CLAUSE_MIN_HEIGHT);
    // Frames can be wider than the viewport, so zoom out enough to show them whole.
    const zoom = node.type === "frame" ? Math.min(1, 900 / width) : 1;
    setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom, duration: 400 });
  }

  function focusFirstMatch() {
    const firstGroup = matchingGroups[0];
    if (firstGroup) {
      const id = collapsed.has(firstGroup) ? groupNodeId(firstGroup) : clusterId(firstGroup);
      centerOn(nodes.find((n) => n.id === id));
      return;
    }
    const firstId = matchingIds[0];
    if (!firstId) return;
    const group = layout.membership.get(firstId);
    if (group && collapsed.has(group)) {
      // Layout is deterministic, so the expanded positions can be computed now
      // rather than waiting for the re-render.
      const next = new Set(collapsed);
      next.delete(group);
      setCollapsed(next);
      centerOn(buildLayout(clauses, argumentsList, next, toggleGroup).clauseNodes.find((n) => n.id === firstId));
    } else {
      centerOn(nodes.find((n) => n.id === firstId));
    }
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
          placeholder="Search clauses…"
          className="min-w-0 flex-1 rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
        />
        {trimmedQuery && (
          <p className="shrink-0 text-xs text-zinc-500">
            {matchingGroups.length > 0 &&
              `${matchingGroups.length} categor${matchingGroups.length === 1 ? "y" : "ies"}, `}
            {matchingIds.length} clause{matchingIds.length === 1 ? "" : "s"} — Enter to jump
          </p>
        )}
      </div>
      <div className="min-h-[400px] w-full flex-1 overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        <ReactFlow
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
            <ControlButton onClick={() => setCollapsed(new Set())} title="Expand all groups" aria-label="Expand all groups">
              <span className="text-base font-bold leading-none">+</span>
            </ControlButton>
            <ControlButton onClick={() => setCollapsed(new Set(allGroups))} title="Collapse all groups" aria-label="Collapse all groups">
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
          id={selected.id}
          text={selected.text}
          support={selected.support}
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
