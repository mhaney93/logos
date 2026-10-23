import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTOSCROLL_DEAD_ZONE, autoscrollVelocity } from "./autoscroll";

test("the pointer resting near the anchor does not scroll", () => {
  assert.deepEqual(autoscrollVelocity(0, 0), { x: 0, y: 0 });
  assert.deepEqual(autoscrollVelocity(AUTOSCROLL_DEAD_ZONE, 0), { x: 0, y: 0 });
});

test("scrolling heads toward the pointer", () => {
  const down = autoscrollVelocity(0, 100);
  assert.equal(down.x, 0);
  assert.ok(down.y > 0);
  const upLeft = autoscrollVelocity(-80, -80);
  assert.ok(upLeft.x < 0 && upLeft.y < 0);
  assert.ok(Math.abs(upLeft.x - upLeft.y) < 1e-9);
});

test("moving farther from the anchor scrolls faster", () => {
  const near = autoscrollVelocity(40, 0).x;
  const far = autoscrollVelocity(200, 0).x;
  assert.ok(far > near * 2);
});

test("speed is capped", () => {
  assert.equal(autoscrollVelocity(100000, 0).x, autoscrollVelocity(200000, 0).x);
});
