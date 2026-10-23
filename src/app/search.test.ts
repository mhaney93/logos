import { test } from "node:test";
import assert from "node:assert/strict";
import { allCategoryPaths, type ClauseData } from "./graphGroups";
import { categoryTrail, enterTarget, matchLabel, matchTrail, moveHighlight, notesSnippet, searchMatches } from "./search";

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

test("clauses whose sidebar notes match come after title matches, with a snippet", () => {
  const withNotes = [
    { id: "n", text: "Fear can be overcome", support: "Aristotle ties this to\n\ncourage on the battlefield.", category: null },
    ...clauses,
  ];
  const matches = searchMatches(withNotes, allCategoryPaths(withNotes), "courage");
  assert.deepEqual(matches.map(matchLabel), ["Courage", "Courage is a mean between cowardice and rashness", "Fear can be overcome"]);
  const notesHit = matches[2];
  assert.equal(notesHit.kind === "clause" && notesHit.snippet, "Aristotle ties this to courage on the battlefield.");
  assert.equal(matches[1].kind === "clause" && matches[1].snippet, undefined);
});

test("a clause matching in both title and notes is listed once, as a title match", () => {
  const both = [{ id: "x", text: "Courage matters", support: "Courage again", category: null }];
  const matches = searchMatches(both, [], "courage");
  assert.equal(matches.length, 1);
  assert.equal(matches[0].kind === "clause" && matches[0].snippet, undefined);
});

test("a notes snippet trims long notes around the hit", () => {
  const long = `${"a".repeat(50)} needle ${"b".repeat(50)}`;
  assert.equal(notesSnippet(long, "needle"), `…${"a".repeat(29)} needle ${"b".repeat(29)}…`);
  assert.equal(notesSnippet("short needle", "needle"), "short needle");
  assert.equal(notesSnippet("nothing here", "needle"), undefined);
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

test("Enter on a list still showing an older query picks the first match for what was typed", () => {
  const stale = searchMatches(clauses, paths, "c");
  const target = enterTarget(stale, "c", "patience", 0, (q) => searchMatches(clauses, paths, q));
  assert.equal(target && matchLabel(target), "Patience is a virtue");
});

test("Enter on a current list picks the highlighted row, or the first when none is", () => {
  const shown = searchMatches(clauses, paths, "courage");
  const matchesFor = () => assert.fail("should not re-search a current list");
  assert.equal(enterTarget(shown, "courage", " Courage ", 1, matchesFor), shown[1]);
  assert.equal(enterTarget(shown, "courage", "courage", -1, matchesFor), shown[0]);
  assert.equal(enterTarget(shown, "courage", "courage", 5, matchesFor), shown[0]);
});

test("Enter with nothing matching picks nothing", () => {
  assert.equal(enterTarget([], "", "zzz", -1, (q) => searchMatches(clauses, paths, q)), undefined);
});
