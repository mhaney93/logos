"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type ClauseData = { id: string; text: string; support: string | null };
type ArgumentData = {
  id: string;
  conclusionId: string;
  premises: { clauseId: string }[];
};

const CLAUSE_WIDTH = 240;
const CLAUSE_PADDING = 20; // 10px top + 10px bottom
const CLAUSE_CHARS_PER_LINE = 32; // rough fit for 240px width at 12px font
const CLAUSE_LINE_HEIGHT = 16;
const CLAUSE_MIN_HEIGHT = 56;

function estimateClauseHeight(text: string) {
  const lines = Math.max(1, Math.ceil(text.length / CLAUSE_CHARS_PER_LINE));
  return Math.max(CLAUSE_MIN_HEIGHT, CLAUSE_PADDING + lines * CLAUSE_LINE_HEIGHT);
}

type NodeData = { label: string };

function ClauseNode({ data }: NodeProps<Node & { data: NodeData }>) {
  return (
    <>
      <Handle type="target" position={Position.Top} />
      <span className="nodrag nopan clause-node-text">{data.label}</span>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

const nodeTypes = { clause: ClauseNode };

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
function argumentColor(index: number) {
  return `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
}

// dagre orders nodes within a rank to minimize edge crossings and ignores
// premise order, so swap same-rank premises' x slots back into saved order.
// All clause nodes share one width, so exchanging slots can't cause overlap.
function orderPremisesLeftToRight(graph: dagre.graphlib.Graph, argumentsList: ArgumentData[]) {
  for (const argument of argumentsList) {
    const byRank = new Map<number, { x: number }[]>();
    for (const premise of argument.premises) {
      const node = graph.node(premise.clauseId);
      byRank.set(node.y, [...(byRank.get(node.y) ?? []), node]);
    }
    for (const rankNodes of byRank.values()) {
      const slots = rankNodes.map((n) => n.x).sort((a, b) => a - b);
      rankNodes.forEach((n, i) => (n.x = slots[i]));
    }
  }
}

function buildLayout(clauses: ClauseData[], argumentsList: ArgumentData[]) {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 });
  graph.setDefaultEdgeLabel(() => ({}));

  const heights = new Map(clauses.map((c) => [c.id, estimateClauseHeight(c.text)]));

  for (const clause of clauses) {
    graph.setNode(clause.id, { width: CLAUSE_WIDTH, height: heights.get(clause.id) });
  }
  for (const argument of argumentsList) {
    for (const premise of argument.premises) {
      graph.setEdge(premise.clauseId, argument.conclusionId);
    }
  }

  dagre.layout(graph);
  orderPremisesLeftToRight(graph, argumentsList);

  const nodes: (Node & { data: NodeData })[] = clauses.map((clause) => {
    const pos = graph.node(clause.id);
    const height = heights.get(clause.id)!;
    return {
      id: clause.id,
      type: "clause",
      position: { x: pos.x - CLAUSE_WIDTH / 2, y: pos.y - height / 2 },
      data: { label: clause.text },
      // RF sets pointer-events: none on nodes when nothing RF-interactive
      // (drag/connect/select) is enabled — re-enable so text is clickable.
      style: { width: CLAUSE_WIDTH, minHeight: height, pointerEvents: "auto" as const },
    };
  });

  const edges: Edge[] = [];
  argumentsList.forEach((argument, index) => {
    // argumentsList is newest-first; count from the oldest so adding an
    // argument doesn't recolor the existing ones.
    const color = argumentColor(argumentsList.length - 1 - index);
    for (const premise of argument.premises) {
      edges.push({
        id: `e-${argument.id}-${premise.clauseId}`,
        source: premise.clauseId,
        target: argument.conclusionId,
        markerEnd: { type: MarkerType.ArrowClosed, color },
        style: { stroke: color, strokeWidth: 2, opacity: 0.85 },
      });
    }
  });

  return { nodes, edges };
}

function clauseNodeStyle(matchState: "match" | "dim" | "normal") {
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
    border: "1px solid color-mix(in srgb, currentColor 15%, transparent)",
    opacity: matchState === "dim" ? 0.3 : 1,
  };
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
  const { setCenter, getNode, fitView } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  const { nodes: baseNodes, edges } = useMemo(
    () => buildLayout(clauses, argumentsList),
    [clauses, argumentsList],
  );

  const trimmedQuery = query.trim().toLowerCase();
  const matchingIds = useMemo(() => {
    if (!trimmedQuery) return new Set<string>();
    return new Set(
      baseNodes
        .filter((n) => n.data.label.toLowerCase().includes(trimmedQuery))
        .map((n) => n.id),
    );
  }, [baseNodes, trimmedQuery]);

  const nodes = useMemo(
    () =>
      baseNodes.map((n) => {
        const state = !trimmedQuery ? "normal" : matchingIds.has(n.id) ? "match" : "dim";
        return { ...n, style: { ...(n.style as object), ...clauseNodeStyle(state) } };
      }),
    [baseNodes, matchingIds, trimmedQuery],
  );

  function focusFirstMatch() {
    const firstId = matchingIds.values().next().value;
    if (!firstId) return;
    const node = getNode(firstId);
    if (!node) return;
    const height = node.measured?.height ?? CLAUSE_MIN_HEIGHT;
    setCenter(
      node.position.x + CLAUSE_WIDTH / 2,
      node.position.y + height / 2,
      { zoom: 1, duration: 400 },
    );
  }

  const selected = clauses.find((c) => c.id === selectedId) ?? null;

  return (
    <div
      ref={wrapperRef}
      className={`flex flex-col gap-3 ${isFullscreen ? "h-screen bg-background p-4" : ""}`}
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") focusFirstMatch();
        }}
        placeholder="Search clauses…"
        className="w-full rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]"
      />
      {trimmedQuery && (
        <p className="text-xs text-zinc-500">
          {matchingIds.size} match{matchingIds.size === 1 ? "" : "es"} — press Enter to jump to the first
        </p>
      )}
      <div className={`${isFullscreen ? "min-h-0 flex-1" : "h-[70vh]"} w-full overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]`}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={[1, 2]}
          selectionOnDrag={false}
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
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
