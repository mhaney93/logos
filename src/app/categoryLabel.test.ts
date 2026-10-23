import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeEmphasis } from "@/lib/edges";
import { CATEGORY_NAME_Z, categoryLabelNode } from "./categoryLabel";
import { FRAME_HEADER } from "./graphLayout";

const box = { left: 100, top: 40, right: 700, bottom: 500 };
const label = categoryLabelNode("Living/Obligation", box, "red", () => {});
const line = { stroke: "red", strokeWidth: 2 };

const lineZs = [
  0,
  edgeEmphasis(line, { bold: false, hovered: true })!.zIndex,
  edgeEmphasis(line, { bold: true, hovered: false })!.zIndex,
];

// On the real map, lines into a frame's clauses crossed its name and took the click
// meant to collapse it, because frames (and so their names) were drawn beneath lines.
test("a category's name sits above every line, even a hovered or bold one", () => {
  for (const z of lineZs) assert.ok(label.zIndex! > z, `label z ${label.zIndex} not above line z ${z}`);
});

// A folded category is drawn as its own clickable node, which must also win over lines.
test("a folded category sits above every line, even a hovered or bold one", () => {
  for (const z of lineZs) assert.ok(CATEGORY_NAME_Z > z, `folded category z ${CATEGORY_NAME_Z} not above line z ${z}`);
});

test("a category's name covers only its frame's header, letting lines beside it take clicks", () => {
  assert.deepEqual(label.position, { x: box.left, y: box.top });
  assert.equal(label.style?.width, box.right - box.left);
  assert.equal(label.style?.height, FRAME_HEADER);
  assert.equal(label.style?.pointerEvents, "none");
});
