import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseArguments, hasOpenArguments, type GraphView } from "./graphGroups";

test("collapseArguments closes every argument but keeps category folds", () => {
  const view: GraphView = {
    collapsed: new Set(["Ethics"]),
    open: new Set(["c1"]),
    pinned: new Set(["c2"]),
    below: new Set(["c3"]),
  };
  const next = collapseArguments(view);
  assert.deepEqual([...next.collapsed], ["Ethics"]);
  assert.equal(hasOpenArguments(view), true);
  assert.equal(hasOpenArguments(next), false);
});
