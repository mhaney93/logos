import { listClauses } from "@/lib/actions/clauses";
import { ClauseForm } from "./ClauseForm";
import { ClauseItem } from "./ClauseItem";

export const dynamic = "force-dynamic";

export default async function ClausesPage() {
  const clauses = await listClauses();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Clauses</h1>

      <ClauseForm />

      <ul className="flex flex-col gap-3">
        {clauses.map((clause) => (
          <ClauseItem
            key={clause.id}
            id={clause.id}
            text={clause.text}
            authorUsername={clause.author.username}
          />
        ))}
        {clauses.length === 0 && (
          <p className="text-sm text-zinc-500">No clauses yet.</p>
        )}
      </ul>
    </div>
  );
}
