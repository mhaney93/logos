import Link from "next/link";
import { listClauses } from "@/lib/actions/clauses";
import { listLayers } from "@/lib/actions/layers";
import { ClauseForm } from "./ClauseForm";
import { ClauseList } from "./ClauseList";

export const dynamic = "force-dynamic";

export default async function ClausesPage() {
  const [clauses, layers] = await Promise.all([listClauses(), listLayers()]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Clauses</h1>

      {layers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No layers yet —{" "}
          <Link href="/layers" className="underline">
            create a layer
          </Link>{" "}
          before publishing clauses.
        </p>
      ) : (
        <ClauseForm layers={layers} />
      )}

      <ClauseList clauses={clauses} layers={layers} />
    </div>
  );
}
