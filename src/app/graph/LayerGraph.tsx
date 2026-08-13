"use client";

import { useMemo, useState } from "react";

type Layer = { id: string; name: string; depth: number };
type Clause = { id: string; text: string; layerId: string };
type Edge = { from: string; to: string };

const RING_GAP = 70;
const INNER_RADIUS = 50;
const OUTER_PADDING = 40; // room for the outermost ring's label

export function LayerGraph({
  layers,
  clauses,
  edges,
}: {
  layers: Layer[];
  clauses: Clause[];
  edges: Edge[];
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const sortedLayers = useMemo(() => [...layers].sort((a, b) => a.depth - b.depth), [layers]);

  const outerRadius = INNER_RADIUS + Math.max(0, sortedLayers.length - 1) * RING_GAP;
  const size = (outerRadius + OUTER_PADDING) * 2;
  const center = size / 2;

  const radiusByLayerId = useMemo(() => {
    const map = new Map<string, number>();
    sortedLayers.forEach((layer, i) => {
      map.set(layer.id, INNER_RADIUS + i * RING_GAP);
    });
    return map;
  }, [sortedLayers]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    const byLayer = new Map<string, Clause[]>();
    for (const clause of clauses) {
      const list = byLayer.get(clause.layerId) ?? [];
      list.push(clause);
      byLayer.set(clause.layerId, list);
    }
    for (const [layerId, list] of byLayer) {
      const radius = radiusByLayerId.get(layerId) ?? INNER_RADIUS;
      list.forEach((clause, i) => {
        const angle = (2 * Math.PI * i) / list.length - Math.PI / 2;
        map.set(clause.id, {
          x: center + radius * Math.cos(angle),
          y: center + radius * Math.sin(angle),
        });
      });
    }
    return map;
  }, [clauses, radiusByLayerId, center]);

  const hovered = clauses.find((c) => c.id === hoveredId) ?? null;

  if (layers.length === 0) {
    return <p className="text-sm text-zinc-500">No layers yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full rounded-lg border border-black/[.08] dark:border-white/[.145]"
      >
        {sortedLayers.map((layer, i) => (
          <g key={layer.id}>
            <circle
              cx={center}
              cy={center}
              r={INNER_RADIUS + i * RING_GAP}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              className="text-zinc-500"
            />
            <text
              x={center}
              y={center - (INNER_RADIUS + i * RING_GAP) - 4}
              textAnchor="middle"
              className="fill-zinc-500 text-[11px]"
            >
              {layer.name}
            </text>
          </g>
        ))}

        {edges.map((edge, i) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const isHighlighted = hoveredId === edge.from || hoveredId === edge.to;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="currentColor"
              strokeWidth={isHighlighted ? 1.5 : 0.75}
              className={isHighlighted ? "text-blue-500" : "text-zinc-400"}
              strokeOpacity={isHighlighted ? 0.9 : 0.4}
              markerEnd="url(#arrow)"
            />
          );
        })}

        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-zinc-400" />
          </marker>
        </defs>

        {clauses.map((clause) => {
          const pos = positions.get(clause.id);
          if (!pos) return null;
          return (
            <circle
              key={clause.id}
              cx={pos.x}
              cy={pos.y}
              r={hoveredId === clause.id ? 7 : 5}
              className={
                hoveredId === clause.id
                  ? "fill-blue-500"
                  : "fill-foreground"
              }
              onMouseEnter={() => setHoveredId(clause.id)}
              onMouseLeave={() => setHoveredId((prev) => (prev === clause.id ? null : prev))}
            >
              <title>{clause.text}</title>
            </circle>
          );
        })}
      </svg>

      <p className="min-h-5 text-sm text-zinc-600 dark:text-zinc-400">
        {hovered ? hovered.text : "Hover a point to read its clause."}
      </p>
    </div>
  );
}
