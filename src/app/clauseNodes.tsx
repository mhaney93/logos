import { Handle, MarkerType, Position, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { NoteBadges } from "./components/NoteBadges";
import type { NoteKind } from "@/lib/notes";
import { EDGE_HIT_WIDTH } from "@/lib/edges";
import { CLAUSE_MIN_HEIGHT } from "./graphLayout";
import { allCategoryPaths, type ArgumentData, type ClauseData } from "./graphGroups";

const CLAUSE_PADDING = 20; // 10px top + 10px bottom
const CLAUSE_CHARS_PER_LINE = 32; // rough fit for 240px width at 12px font
const CLAUSE_LINE_HEIGHT = 16;

export function estimateClauseHeight(text: string) {
  const lines = Math.max(1, Math.ceil(text.length / CLAUSE_CHARS_PER_LINE));
  return Math.max(CLAUSE_MIN_HEIGHT, CLAUSE_PADDING + lines * CLAUSE_LINE_HEIGHT);
}

export type ClauseNodeData = {
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

export function ClauseNode({ data }: NodeProps<Node<ClauseNodeData>>) {
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

// Golden-angle hue steps keep neighboring arguments' colors far apart
// no matter how many arguments exist.
function hueColor(index: number) {
  return `hsl(${(index * 137.508) % 360}, 70%, 50%)`;
}

export function categoryColors(allClauses: ClauseData[]) {
  return new Map(allCategoryPaths(allClauses).map((p, i) => [p, hueColor(i + 3)]));
}

// allArguments is newest-first; count from the oldest so adding an argument,
// or opening a chain, doesn't recolor the existing ones.
export function argumentColors(allArguments: ArgumentData[]) {
  return new Map(allArguments.map((a, i) => [a.id, hueColor(allArguments.length - 1 - i)]));
}

export function argumentEdges(argumentsList: ArgumentData[], argumentColor: Map<string, string>) {
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
  return edges;
}

export type MatchState = "match" | "premise" | "dim" | "normal";

export function clauseNodeStyle(matchState: MatchState, accent?: string) {
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
