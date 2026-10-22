import { test } from "node:test";
import assert from "node:assert/strict";
import { allCategoryPaths, type ClauseData } from "./graphGroups";
import { categoryTrail, matchLabel, matchTrail, moveHighlight, searchMatches } from "./search";

const clause = (id: string, text: string, category: string | null): ClauseData => ({ id, text, support: null, category });
const clauses = [
  clause("a", "Courage is a mean between cowardice and rashness", "Ethics/Virtues/Courage"),
  clause("b", "All humans are mortal", null),
  clause("c", "Patience is a virtue", "Ethics/Virtues"),
];
const paths = allCategoryPaths(clauses);

test("no query, no matches", () => {
  assert.deepEqual(searchMatches(clauses, paths, "   "), []);
});

test("matches clause text and category names case-insensitively, categories first", () => {
  const matches = searchMatches(clauses, paths, " COURAGE ");
  assert.deepEqual(matches.map(matchLabel), ["Courage", "Courage is a mean between cowardice and rashness"]);
  assert.deepEqual(matches.map((m) => m.kind), ["category", "clause"]);
});

test("a category matches on its own name, not its parents'", () => {
  const matches = searchMatches(clauses, paths, "ethics");
  assert.deepEqual(matches.map(matchLabel), ["Ethics"]);
});

test("trail reads most specific category first", () => {
  assert.equal(categoryTrail("Ethics/Virtues/Courage"), "Courage <- Virtues <- Ethics");
  assert.equal(categoryTrail("Ethics"), "Ethics");
  assert.equal(categoryTrail(null), "");
});

test("a clause's trail is its category; a category's trail is its parents", () => {
  const [category, courageClause] = searchMatches(clauses, paths, "courage");
  assert.equal(matchTrail(courageClause), "Courage <- Virtues <- Ethics");
  assert.equal(matchTrail(category), "Virtues <- Ethics");
  const [uncategorized] = searchMatches(clauses, paths, "mortal");
  assert.equal(matchTrail(uncategorized), "");
  const [topLevel] = searchMatches(clauses, paths, "ethics");
  assert.equal(matchTrail(topLevel), "");
});

test("arrow down enters the list from the input and stops at the last row", () => {
  assert.equal(moveHighlight(-1, "ArrowDown", 3), 0);
  assert.equal(moveHighlight(1, "ArrowDown", 3), 2);
  assert.equal(moveHighlight(2, "ArrowDown", 3), 2);
});

test("arrow up climbs back to the input", () => {
  assert.equal(moveHighlight(2, "ArrowUp", 3), 1);
  assert.equal(moveHighlight(0, "ArrowUp", 3), -1);
  assert.equal(moveHighlight(-1, "ArrowUp", 3), -1);
});

test("with no matches nothing is highlighted", () => {
  assert.equal(moveHighlight(-1, "ArrowDown", 0), -1);
  assert.equal(moveHighlight(4, "ArrowUp", 0), -1);
});
