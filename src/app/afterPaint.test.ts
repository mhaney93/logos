import assert from "node:assert/strict";
import { test } from "vitest";
import { afterPaint } from "./afterPaint";

test("work waits for a frame and then for that frame's paint", () => {
  const frames: (() => void)[] = [];
  const tasks: (() => void)[] = [];
  globalThis.requestAnimationFrame = (cb) => frames.push(() => cb(0));
  globalThis.setTimeout = ((cb: () => void) => tasks.push(cb)) as typeof setTimeout;

  let ran = false;
  afterPaint(() => (ran = true));
  assert.equal(ran, false);
  assert.equal(tasks.length, 0);

  frames.shift()!();
  assert.equal(ran, false);

  tasks.shift()!();
  assert.equal(ran, true);
});
