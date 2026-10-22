"use client";

import { useRef } from "react";

export function SearchInput({
  value,
  onChange,
  onEnter,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        placeholder={placeholder}
        className="w-full rounded-full border border-black/[.08] py-2 pr-9 pl-4 text-sm dark:border-white/[.145]"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          title="Clear search"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-lg leading-none text-zinc-500 hover:bg-black/[.06] dark:hover:bg-white/[.1]"
        >
          ×
        </button>
      )}
    </div>
  );
}
