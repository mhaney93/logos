"use client";

import { useMemo, useState } from "react";
import {
  ReactFlow,
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
  for (const argument of argumentsList) {
    for (const premise of argument.premises) {
      edges.push({
        id: `e-${argument.id}-${premise.clauseId}`,
        source: premise.clauseId,
        target: argument.conclusionId,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { opacity: 0.5 },
      });
    }
  }

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
  const { setCenter, getNode } = useReactFlow();
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
    <div className="flex flex-col gap-3">
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
      <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
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
          <Controls showInteractive={false} />
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
