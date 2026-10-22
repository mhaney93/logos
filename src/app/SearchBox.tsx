"use client";

import { useEffect, useId, useRef, useState } from "react";
import { enterTarget, matchKey, matchLabel, matchTrail, moveHighlight, type SearchMatch } from "./search";

export function SearchBox({
  query,
  onQueryChange,
  matches,
  matchesQuery,
  matchesFor,
  onPick,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  matches: SearchMatch[];
  matchesQuery: string;
  matchesFor: (query: string) => SearchMatch[];
  onPick: (match: SearchMatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const listId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const showList = open && matches.length > 0;
  const optionId = (i: number) => `${listId}-option-${i}`;

  useEffect(() => {
    if (highlight >= 0) listRef.current?.children[highlight]?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function pick(match: SearchMatch | undefined) {
    if (!match) return;
    setOpen(false);
    setHighlight(-1);
    onPick(match);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
          setHighlight(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setHighlight((i) => moveHighlight(i, e.key as "ArrowDown" | "ArrowUp", matches.length));
          } else if (e.key === "Enter") {
            pick(enterTarget(matches, matchesQuery, query, highlight, matchesFor));
          } else if (e.key === "Escape") {
            setOpen(false);
            setHighlight(-1);
          }
        }}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && highlight >= 0 ? optionId(highlight) : undefined}
        placeholder="Search clauses or categories…"
        className="w-full rounded-full border border-black/[.08] py-2 pr-9 pl-4 text-sm dark:border-white/[.145]"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          title="Clear search"
          // Keep focus in the input so the blur doesn't close and reopen the list.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onQueryChange("");
            setOpen(false);
            setHighlight(-1);
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-zinc-500 hover:bg-black/[.06] dark:hover:bg-white/[.1]"
        >
          ×
        </button>
      )}
      {showList && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Search matches"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-black/[.08] bg-background py-1 text-sm shadow-lg dark:border-white/[.145]"
        >
          {matches.map((match, i) => {
            const trail = matchTrail(match);
            return (
              <li
                key={matchKey(match)}
                id={optionId(i)}
                role="option"
                aria-selected={i === highlight}
                // Keep focus in the input so the blur doesn't close the list mid-click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(match)}
                onMouseMove={() => setHighlight(i)}
                className={`cursor-pointer px-4 py-1.5 ${i === highlight ? "bg-amber-500/20" : ""}`}
              >
                <div className={`truncate ${match.kind === "category" ? "font-semibold" : ""}`}>
                  {matchLabel(match)}
                </div>
                {trail && <div className="truncate text-xs text-zinc-500">{trail}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
