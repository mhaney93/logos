import { listArguments } from "@/lib/actions/arguments";
import { listClauses } from "@/lib/actions/clauses";
import { ArgumentGraph } from "./ArgumentGraph";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [clauses, argumentsList] = await Promise.all([listClauses(), listArguments()]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-8 py-12">
      <h1 className="text-center text-3xl font-semibold tracking-tight">
        Argument Graph
      </h1>

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
