import type { CSSProperties } from "react";

// Wider than the drawn line so it's easy to hit, including by touch.
export const EDGE_HIT_WIDTH = 16;

// A clicked line stays bold; a hovered one thickens and brightens so it's
// clear which line a click will land on.
export function edgeEmphasis(style: CSSProperties, state: { bold: boolean; hovered: boolean }) {
  if (state.bold) return { zIndex: 1000, style: { ...style, strokeWidth: 6, opacity: 1 } };
  if (state.hovered) {
    return { zIndex: 1000, style: { ...style, strokeWidth: 4, opacity: 1, filter: "brightness(1.25)" } };
  }
  return null;
}
