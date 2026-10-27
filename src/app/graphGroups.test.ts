import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseCategories, expandedView, groupNodeId, homeView, isExpandedView, visibleChains } from "./graphGroups";

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

const crossClauses = [
  { id: "x", text: "x", support: null, category: "Ethics" },
  { id: "y", text: "y", support: null, category: "Logic" },
  { id: "z", text: "z", support: null, category: "Politics" },
];
// x (Ethics) and z (Politics) both argue for y (Logic).
const crossArguments = [{ id: "a", conclusionId: "y", premises: [{ clauseId: "x" }, { clauseId: "z" }] }];

function shownEdges(view: ReturnType<typeof homeView>) {
  const shown = visibleChains(crossClauses, crossArguments, view);
  const { arguments: args } = collapseCategories(shown.clauses, shown.arguments, view.collapsed);
  return args.flatMap((a) => a.premises.map((p) => `${p.clauseId}->${a.conclusionId}`)).sort();
}

test("folded categories still link to each other", () => {
  assert.deepEqual(shownEdges(homeView(["Ethics", "Logic", "Politics"])), [
    `${groupNodeId("Ethics")}->${groupNodeId("Logic")}`,
    `${groupNodeId("Politics")}->${groupNodeId("Logic")}`,
  ]);
});

test("opening a category doesn't link its clauses to another category until their bottom dot is clicked", () => {
  const opened = { ...homeView(["Ethics", "Logic", "Politics"]), collapsed: new Set(["Logic", "Politics"]) };
  assert.deepEqual(shownEdges(opened), [`${groupNodeId("Politics")}->${groupNodeId("Logic")}`]);
  assert.deepEqual(shownEdges({ ...opened, below: new Set(["x"]) }), [
    `${groupNodeId("Politics")}->${groupNodeId("Logic")}`,
    `x->${groupNodeId("Logic")}`,
  ]);
});
