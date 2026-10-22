import { test } from "node:test";
import assert from "node:assert/strict";
import { noteKinds } from "./notes";

test("no notes, no badge", () => {
  assert.deepEqual(noteKinds(null), []);
  assert.deepEqual(noteKinds("  \n\n "), []);
});

test("quote and example paragraphs get their own badges", () => {
  assert.deepEqual(noteKinds("“To be is to do.” — Kant\n\nExamples: running."), ["quote", "example"]);
});

test("notes with no quote or example get the generic badge", () => {
  assert.deepEqual(noteKinds("Enduring delay without complaint. Vices: Impatience / Submissiveness."), ["notes"]);
});

test("the generic badge isn't added next to a quote or example badge", () => {
  assert.deepEqual(noteKinds("Some prose.\n\nExample: waiting in line."), ["example"]);
});
