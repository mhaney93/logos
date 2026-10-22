import { test } from "node:test";
import assert from "node:assert/strict";
import { collapseCategories, prefixes, type ArgumentData, type ClauseData } from "./graphGroups";
import { layoutMap, type Box } from "./graphLayout";

// Cut down from the real map: laying this out with dagre's compound (clustered)
// mode threw "Not possible to find intersection inside of the rectangle".
const shape: [string, string, number][] = [
  ["c1", "Politics/Punishment", 88],
  ["c2", "Metaphysics/Self", 72],
  ["c3", "Living/Living Well", 72],
  ["c4", "Living/Living Well", 72],
  ["c5", "Living/Honesty", 56],
  ["c6", "Politics/Obeying the Law", 88],
  ["c7", "Virtues/Virtue Theory", 104],
  ["c8", "Politics/Obeying the Law", 104],
  ["c9", "Politics/Obeying the Law", 72],
  ["c10", "Politics/Public Honesty", 88],
  ["c11", "Living/Honesty", 120],
  ["c12", "Living/Obligation", 136],
  ["c13", "Virtues/Intellectual Virtues", 136],
  ["c14", "Virtues/Courage", 56],
  ["c15", "Virtues/Courage", 104],
  ["c16", "Virtues/Courage", 72],
  ["c17", "Virtues/Courage", 72],
  ["c18", "Virtues/Courage", 104],
  ["c19", "Virtues/Integrity", 72],
  ["c20", "Virtues/Integrity", 72],
  ["c21", "Virtues/Integrity", 56],
  ["c22", "Virtues/Integrity", 56],
  ["c23", "Virtues/Integrity", 136],
  ["c24", "Virtues/Integrity", 120],
  ["c25", "Virtues/Integrity", 88],
  ["c26", "Virtues/Virtue Theory", 120],
  ["c27", "Virtues/Virtue Theory", 72],
  ["c28", "Metaphysics/Self", 104],
  ["c29", "Metaphysics/Self", 136],
];
const links: [string, string][] = [
  ["c2", "c29"], ["c4", "c3"], ["c5", "c4"], ["c11", "c5"], ["c8", "c6"], ["c7", "c27"],
  ["c9", "c8"], ["c11", "c10"], ["c9", "c12"], ["c29", "c28"],
  ...["c13", "c14", "c15", "c16", "c17", "c18", "c19", "c20", "c21", "c22", "c23", "c24", "c25", "c26"].map(
    (c) => ["c27", c] as [string, string],
  ),
];

const clauses: ClauseData[] = shape.map(([id, category]) => ({ id, text: "", support: null, category }));
const argumentsList: ArgumentData[] = links.map(([premise, conclusion]) => ({
  id: `a-${conclusion}`,
  conclusionId: conclusion,
  premises: [{ clauseId: premise }],
}));
const heights = new Map(shape.map(([id, , height]) => [id, height]));

const overlaps = (a: Box, b: Box) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

test("lays out the shape that crashed dagre's clustered layout", () => {
  const { placed, frames } = layoutMap(clauses, argumentsList, [], heights);
  const boxes = clauses.map((c) => {
    const n = placed.get(c.id);
    assert.ok(n && Number.isFinite(n.x) && Number.isFinite(n.y), `${c.id} has a position`);
    return { clause: c, box: { left: n.x - n.width / 2, right: n.x + n.width / 2, top: n.y - n.height / 2, bottom: n.y + n.height / 2 } };
  });

  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) assert.ok(!overlaps(a.box, b.box), `${a.clause.id} overlaps ${b.clause.id}`);
    for (const path of prefixes(a.clause.category!)) {
      const frame = frames.get(path)!;
      const inside = a.box.left >= frame.left && a.box.right <= frame.right && a.box.top >= frame.top && a.box.bottom <= frame.bottom;
      assert.ok(inside, `${a.clause.id} sits inside ${path}`);
    }
  }

  const framed = [...frames];
  for (const [i, [p, a]] of framed.entries()) {
    for (const [q, b] of framed.slice(i + 1)) {
      if (p.startsWith(`${q}/`) || q.startsWith(`${p}/`)) continue;
      assert.ok(!overlaps(a, b), `${p} overlaps ${q}`);
    }
  }
});

test("a folded category keeps its node inside its open parent", () => {
  const folded = collapseCategories(clauses, argumentsList, new Set(["Virtues/Courage"]));
  assert.deepEqual(folded.foldedPaths, ["Virtues/Courage"]);
  const { placed, frames } = layoutMap(folded.clauses, folded.arguments, folded.foldedPaths, heights);
  const node = placed.get("group:Virtues/Courage")!;
  const parent = frames.get("Virtues")!;
  assert.ok(node.x - node.width / 2 >= parent.left && node.x + node.width / 2 <= parent.right);
  assert.ok(node.y - node.height / 2 >= parent.top && node.y + node.height / 2 <= parent.bottom);
  assert.equal(frames.has("Virtues/Courage"), false);
});
