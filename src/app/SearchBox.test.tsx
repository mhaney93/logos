import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "@/lib/testDom";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { allCategoryPaths, type ClauseData } from "./graphGroups";
import { searchMatches } from "./search";
import { SearchBox } from "./SearchBox";

const clauses: ClauseData[] = [
  { id: "a", text: "Courage is a virtue", support: null, category: "Ethics/Virtues/Courage" },
  { id: "b", text: "Patience is a virtue", support: null, category: "Ethics/Virtues" },
];
const paths = allCategoryPaths(clauses);
const matchesFor = (q: string) => searchMatches(clauses, paths, q);

function Harness() {
  const [query, setQuery] = useState("");
  return (
    <SearchBox
      query={query}
      onQueryChange={setQuery}
      matches={matchesFor(query)}
      matchesQuery={query}
      matchesFor={matchesFor}
      onPick={() => {}}
    />
  );
}

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => createRoot(container).render(<Harness />));
  const input = container.querySelector("input")!;
  return {
    input,
    clear: () => container.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]'),
    list: () => container.querySelector('[role="listbox"]'),
  };
}

async function type(input: HTMLInputElement, text: string) {
  const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    input.focus();
    setValue.call(input, text);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

const press = (input: HTMLInputElement, key: string) =>
  act(async () => input.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key, bubbles: true })));

test("the clear button only appears once there's a query", async () => {
  const { input, clear } = await mount();
  assert.equal(clear(), null);
  await type(input, "virtue");
  assert.ok(clear());
});

test("clicking clear empties the query, closes the dropdown, and keeps focus in the input", async () => {
  const { input, clear, list } = await mount();
  await type(input, "virtue");
  assert.ok(list());
  await act(async () => clear()!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  assert.equal(input.value, "");
  assert.equal(list(), null);
  assert.equal(clear(), null);
  assert.equal(document.activeElement, input);
});

test("after clearing, typing again reopens the dropdown and the arrow keys still choose a match", async () => {
  const { input, clear, list } = await mount();
  await type(input, "virtue");
  await act(async () => clear()!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  await type(input, "patience");
  assert.ok(list());
  await press(input, "ArrowDown");
  assert.equal(list()!.querySelector('[aria-selected="true"]')?.textContent, "Patience is a virtueVirtues <- Ethics");
});
