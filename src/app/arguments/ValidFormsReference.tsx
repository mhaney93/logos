import { VALID_ARGUMENT_FORMS } from "@/lib/argumentForms";

export function ValidFormsReference() {
  return (
    <details className="rounded-lg border border-black/[.08] p-4 text-sm dark:border-white/[.145]">
      <summary className="cursor-pointer font-medium">Valid argument forms</summary>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {VALID_ARGUMENT_FORMS.map((form) => (
          <div key={form.label}>
            <dt className="font-medium">{form.label}</dt>
            <dd className="text-xs text-zinc-500">{form.description}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
