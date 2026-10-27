import { test } from "node:test";
import assert from "node:assert/strict";
import { expandedView, homeView, isExpandedView } from "./graphGroups";

const allPaths = ["Ethics", "Ethics/Virtues", "Logic"];
const premisesOf = new Map([["c1", ["p1", "p2"]]]);
const conclusionsOf = new Map([["p1", ["c1"]], ["p2", ["c1"]]]);

test("homeView folds every category and closes every argument, like a fresh load", () => {
  const home = homeView(allPaths);
  assert.deepEqual([...home.collapsed], allPaths);
  assert.equal(home.open.size + home.pinned.size + home.below.size, 0);
});

test("expandedView unfolds every category and opens every argument both ways", () => {
  const all = expandedView(premisesOf, conclusionsOf);
  assert.equal(all.collapsed.size, 0);
  assert.deepEqual([...all.open], ["c1"]);
  assert.deepEqual([...all.below].sort(), ["p1", "p2"]);
  assert.equal(isExpandedView(all, premisesOf, conclusionsOf), true);
});

test("isExpandedView is false while anything is still folded or closed", () => {
  const all = expandedView(premisesOf, conclusionsOf);
  assert.equal(isExpandedView(homeView(allPaths), premisesOf, conclusionsOf), false);
  assert.equal(isExpandedView({ ...all, collapsed: new Set(["Logic"]) }, premisesOf, conclusionsOf), false);
  assert.equal(isExpandedView({ ...all, open: new Set() }, premisesOf, conclusionsOf), false);
  assert.equal(isExpandedView({ ...all, below: new Set(["p1"]) }, premisesOf, conclusionsOf), false);
});
