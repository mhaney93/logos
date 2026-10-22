import { test } from "node:test";
import assert from "node:assert/strict";
import { edgeEmphasis } from "./edges";

const base = { stroke: "red", strokeWidth: 2, opacity: 0.85 };

test("a plain line is left as drawn", () => {
  assert.equal(edgeEmphasis(base, { bold: false, hovered: false }), null);
});

test("a hovered line thickens, brightens, and rises above the rest", () => {
  const e = edgeEmphasis(base, { bold: false, hovered: true })!;
  assert.equal(e.zIndex, 1000);
  assert.equal(e.style.stroke, "red");
  assert.ok(Number(e.style.strokeWidth) > base.strokeWidth);
  assert.equal(e.style.opacity, 1);
  assert.match(String(e.style.filter), /brightness/);
});

test("a clicked line stays bolder than a hovered one", () => {
  const bold = edgeEmphasis(base, { bold: true, hovered: true })!;
  const hovered = edgeEmphasis(base, { bold: false, hovered: true })!;
  assert.ok(Number(bold.style.strokeWidth) > Number(hovered.style.strokeWidth));
});
