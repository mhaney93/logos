import { listClauses } from "@/lib/actions/clauses";
import { ClauseForm } from "./ClauseForm";
import { ClauseList } from "./ClauseList";

export const dynamic = "force-dynamic";

export default async function ClausesPage() {
  const clauses = await listClauses();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Clauses</h1>

      <ClauseForm />

      <ClauseList clauses={clauses} />
    </div>
  );
}
