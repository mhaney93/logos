import { listArguments } from "@/lib/actions/arguments";
import { listClauses } from "@/lib/actions/clauses";
import { ArgumentGraph } from "./ArgumentGraph";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [clauses, argumentsList] = await Promise.all([listClauses(), listArguments()]);

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col px-4 py-3">
      <ArgumentGraph
        clauses={clauses.map((c) => ({ id: c.id, text: c.text, support: c.support }))}
        arguments={argumentsList.map((a) => ({
          id: a.id,
          conclusionId: a.conclusionId,
          premises: a.premises.map((p) => ({ clauseId: p.clauseId })),
        }))}
      />
    </main>
  );
}
