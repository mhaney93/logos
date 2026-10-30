"use client";

import { useMemo, useState } from "react";
import { ReactFlow, ReactFlowProvider, type Node } from "@xyflow/react";
import { noteKinds } from "@/lib/notes";
import { edgeEmphasis } from "@/lib/edges";
import { CLAUSE_WIDTH, layoutMap } from "./graphLayout";
import { argumentTree, type ArgumentData, type ClauseData } from "./graphGroups";
import {
  argumentColors,
  argumentEdges,
  categoryColors,
  ClauseNode,
  clauseNodeStyle,
  estimateClauseHeight,
  type ClauseNodeData,
} from "./clauseNodes";

const nodeTypes = { clause: ClauseNode };

// A mini map of one conclusion and every premise it rests on, filling the space left of the sidebar.
export function ArgumentMap({
  conclusionId,
  clauses: allClauses,
  arguments: allArguments,
  activeId,
  onOpen,
  onClose,
}: {
  conclusionId: string;
  clauses: ClauseData[];
  arguments: ArgumentData[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const [boldEdgeId, setBoldEdgeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const layout = useMemo(() => {
    const tree = argumentTree(conclusionId, allClauses, allArguments);
    const color = categoryColors(allClauses);
    const heights = new Map(tree.clauses.map((c) => [c.id, estimateClauseHeight(c.text)]));
    // Categories would frame the map; here only the chain of reasoning matters.
    const uncategorized = tree.clauses.map((c) => ({ ...c, category: null }));
    const { placed } = layoutMap(uncategorized, tree.arguments, [], heights);
    const nodes: Node<ClauseNodeData>[] = tree.clauses.map((clause) => {
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
          hasPremises: false,
          open: false,
          onToggleChain: () => {},
          hasConclusions: false,
          below: false,
          onToggleBelow: () => {},
        },
        style: { width: CLAUSE_WIDTH, minHeight: height, pointerEvents: "auto" as const },
      };
    });
    return { nodes, edges: argumentEdges(tree.arguments, argumentColors(allArguments)) };
  }, [conclusionId, allClauses, allArguments]);

  const nodes = useMemo(
    () =>
      layout.nodes.map((n) => ({
        ...n,
        style: { ...n.style, ...clauseNodeStyle(n.id === activeId ? "match" : "normal", n.data.accent) },
      })),
    [layout.nodes, activeId],
  );

  const edges = useMemo(
    () =>
      layout.edges.map((e) => {
        const emphasis = edgeEmphasis(e.style ?? {}, { bold: e.id === boldEdgeId, hovered: e.id === hoveredEdgeId });
        return emphasis ? { ...e, ...emphasis } : e;
      }),
    [layout.edges, boldEdgeId, hoveredEdgeId],
  );

  const conclusion = allClauses.find((c) => c.id === conclusionId);

  return (
    <section
      aria-label="Argument map"
      className="fixed inset-y-0 left-0 right-[min(28rem,100%)] z-50 flex flex-col gap-3 bg-background p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Argument for </span>
          <span className="font-medium">{conclusion?.text}</span>
        </p>
        <button
          onClick={onClose}
          className="shrink-0 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Close
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-black/[.08] dark:border-white/[.145]">
        {/* Its own provider, so this map's viewport and nodes stay apart from the main map's. */}
        <ReactFlowProvider>
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
            proOptions={{ hideAttribution: true }}
            onEdgeClick={(_, edge) => setBoldEdgeId((id) => (id === edge.id ? null : edge.id))}
            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            onNodeClick={(_, node) => {
              if (window.getSelection()?.toString()) return;
              onOpen(node.id);
            }}
          />
        </ReactFlowProvider>
      </div>
    </section>
  );
}
