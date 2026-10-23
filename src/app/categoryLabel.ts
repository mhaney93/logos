import type { Node } from "@xyflow/react";
import { RAISED_EDGE_Z } from "@/lib/edges";
import { clusterId } from "./graphGroups";
import { FRAME_HEADER, type Box } from "./graphLayout";

export const CATEGORY_NAME_Z = RAISED_EDGE_Z + 1;

export type CategoryLabelData = { path: string; accent: string; onToggle: () => void };

// Frames sit beneath the lines, and a line drawn across a frame's name would swallow
// the click meant to collapse it. So the name is a node of its own above every line,
// over a strip that lets pointer events through to the lines beside it.
export function categoryLabelNode(path: string, box: Box, accent: string, onToggle: () => void): Node<CategoryLabelData> {
  return {
    id: `${clusterId(path)}:label`,
    type: "categoryLabel",
    position: { x: box.left, y: box.top },
    data: { path, accent, onToggle },
    style: { width: box.right - box.left, height: FRAME_HEADER, pointerEvents: "none" },
    zIndex: CATEGORY_NAME_Z,
    selectable: false,
  };
}
