import type { CSSProperties } from "react";

// Wider than React Flow's 20px default hit area so lines are easy to hit, including by touch.
export const EDGE_HIT_WIDTH = 24;

// Where hovered and bold lines rise to; anything that must stay clickable over lines sits above it.
export const RAISED_EDGE_Z = 1000;

// A clicked line stays bold; a hovered one thickens and brightens so it's
// clear which line a click will land on.
export function edgeEmphasis(style: CSSProperties, state: { bold: boolean; hovered: boolean }) {
  if (state.bold) return { zIndex: RAISED_EDGE_Z, style: { ...style, strokeWidth: 6, opacity: 1 } };
  if (state.hovered) {
    return { zIndex: RAISED_EDGE_Z, style: { ...style, strokeWidth: 4, opacity: 1, filter: "brightness(1.25)" } };
  }
  return null;
}
