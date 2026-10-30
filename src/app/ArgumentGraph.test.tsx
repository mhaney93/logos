import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "@/lib/testDom";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { ArgumentGraph } from "./ArgumentGraph";
import type { ArgumentData, ClauseData } from "./graphGroups";

// React Flow measures its container and nodes; jsdom has no layout or frames, so stub them.
const stubs = {
  ResizeObserver: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0),
  cancelAnimationFrame: (id: number) => clearTimeout(id),
};
Object.assign(globalThis, stubs);
Object.assign(dom.window, stubs);

const clauses: ClauseData[] = [
  { id: "a", text: "Courage is a virtue", support: null, category: "Ethics/Virtues" },
  { id: "b", text: "Virtues are good", support: null, category: "Ethics" },
  { id: "c", text: "Courage is good", support: "Follows from the two.", category: "Ethics" },
];
const argumentsList: ArgumentData[] = [{ id: "arg", conclusionId: "c", premises: [{ clauseId: "a" }, { clauseId: "b" }] }];

// useId hands a remounted tree fresh ids; they only wire labels to lists, so ignore them.
const html = (container: HTMLElement) => container.innerHTML.replace(/_r_\w+_/g, "_id_");

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

function button(container: HTMLElement, text: string) {
  return [...container.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;
}

test("Collapse all leaves the page exactly as a fresh load renders it", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => createRoot(container).render(<ArgumentGraph clauses={clauses} arguments={argumentsList} />));
  await settle();
  const fresh = html(container);

  const input = container.querySelector("input")!;
  const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setValue.call(input, "courage");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await act(async () => button(container, "Ethics ▸").click());
  await settle();
  await act(async () => (container.querySelector(".react-flow__node-clause") as HTMLElement).click());
  await settle();
  assert.notEqual(html(container), fresh);
  assert.ok(container.querySelector("aside"), "clicking a clause opens its sidebar");

  await act(async () => button(container, "Collapse all").click());
  await settle();
  await settle();
  assert.equal(html(container), fresh);
});

test("Show Argument maps a conclusion's premises and stacks their sidebars", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => createRoot(container).render(<ArgumentGraph clauses={clauses} arguments={argumentsList} />));
  await settle();
  await act(async () => button(container, "Ethics ▸").click());
  await settle();

  const node = (root: Element, text: string) =>
    [...root.querySelectorAll<HTMLElement>(".react-flow__node-clause")].find((n) => n.textContent?.includes(text))!;
  const escape = () => act(async () => dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape" })));
  const sidebar = () => container.querySelector("aside")?.querySelector("p")?.textContent;
  const map = () => container.querySelector('section[aria-label="Argument map"]');

  await act(async () => node(container, "Courage is good").click());
  await act(async () => button(container, "Show Argument").click());
  await settle();
  assert.deepEqual(
    [...map()!.querySelectorAll(".clause-node-text")].map((n) => n.textContent).sort(),
    ["Courage is a virtue", "Courage is good", "Virtues are good"],
  );

  await act(async () => node(map()!, "Courage is a virtue").click());
  assert.equal(sidebar(), "Courage is a virtue");
  assert.equal(container.querySelectorAll("aside").length, 1, "the sidebar beneath is hidden");
  assert.equal(button(container, "Show Argument"), undefined, "a clause no argument concludes has nothing to show");

  await escape();
  assert.equal(sidebar(), "Courage is good");
  assert.ok(map());
  await escape();
  assert.equal(map(), null);
  assert.equal(sidebar(), "Courage is good");
  await escape();
  assert.equal(container.querySelector("aside"), null);
});
