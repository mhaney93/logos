"use client";

import { ARGUMENT_FORMS, type ArgumentFormId } from "@/lib/argumentForms";

export function FormSelector({
  value,
  onChange,
}: {
  value: ArgumentFormId | null;
  onChange: (id: ArgumentFormId) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">
        Choose the argument&apos;s logical form
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ARGUMENT_FORMS.map((form) => (
          <label
            key={form.id}
            className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
              value === form.id
                ? "border-foreground bg-black/[.03] dark:bg-white/[.06]"
                : "border-black/[.08] hover:bg-black/[.02] dark:border-white/[.145] dark:hover:bg-white/[.04]"
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name="argumentForm"
                checked={value === form.id}
                onChange={() => onChange(form.id)}
              />
              {form.label}
            </span>
            <span className="pl-5 text-xs text-zinc-500">{form.description}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
