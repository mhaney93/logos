import { test } from "node:test";
import assert from "node:assert/strict";
import { dom } from "@/lib/testDom";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { SearchInput } from "./SearchInput";

function Harness() {
  const [query, setQuery] = useState("");
  return <SearchInput value={query} onChange={setQuery} onEnter={() => {}} placeholder="Search" />;
}

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  await act(async () => createRoot(container).render(<Harness />));
  const input = container.querySelector("input")!;
  const clear = () => container.querySelector<HTMLButtonElement>('button[aria-label="Clear search"]');
  return { input, clear };
}

async function type(input: HTMLInputElement, text: string) {
  const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await act(async () => {
    setValue.call(input, text);
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

test("the clear button only appears once there's a query", async () => {
  const { input, clear } = await mount();
  assert.equal(clear(), null);
  await type(input, "courage");
  assert.ok(clear());
});

test("clicking clear empties the query and keeps focus in the input", async () => {
  const { input, clear } = await mount();
  await type(input, "courage");
  await act(async () => clear()!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  assert.equal(input.value, "");
  assert.equal(clear(), null);
  assert.equal(document.activeElement, input);
});
