import { test } from "node:test";
import assert from "node:assert/strict";
import { expandedView, homeView, isExpandedView, isHomeView, type GraphView } from "./graphGroups";

const allPaths = ["Ethics", "Ethics/Virtues", "Logic"];
const premisesOf = new Map([["c1", ["p1", "p2"]]]);
const conclusionsOf = new Map([["p1", ["c1"]], ["p2", ["c1"]]]);

test("homeView folds every category and closes every argument, like a fresh load", () => {
  const home = homeView(allPaths);
  assert.deepEqual([...home.collapsed], allPaths);
  assert.equal(home.open.size + home.pinned.size + home.below.size, 0);
  assert.equal(isHomeView(home, allPaths), true);
});

test("isHomeView is false once anything is unfolded, opened, pinned, or shown below", () => {
  const home = homeView(allPaths);
  const unfolded: GraphView = { ...home, collapsed: new Set(["Ethics"]) };
  assert.equal(isHomeView(unfolded, allPaths), false);
  assert.equal(isHomeView({ ...home, open: new Set(["c1"]) }, allPaths), false);
  assert.equal(isHomeView({ ...home, pinned: new Set(["c1"]) }, allPaths), false);
  assert.equal(isHomeView({ ...home, below: new Set(["p1"]) }, allPaths), false);
  assert.equal(isHomeView(expandedView(premisesOf, conclusionsOf), allPaths), false);
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
