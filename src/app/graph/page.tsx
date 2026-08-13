import { listArguments } from "@/lib/actions/arguments";
import { listClauses } from "@/lib/actions/clauses";
import { listLayers } from "@/lib/actions/layers";
import { LayerGraph } from "./LayerGraph";

export const dynamic = "force-dynamic";

export default async function GraphPage() {
  const [clauses, args, layers] = await Promise.all([
    listClauses(),
    listArguments(),
    listLayers(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Layer graph</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Each ring is a layer of analysis, innermost = most fundamental. Lines run
          from a premise to the conclusion it supports.
        </p>
      </div>

      <LayerGraph
        layers={layers}
        clauses={clauses.map((c) => ({ id: c.id, text: c.text, layerId: c.layerId }))}
        edges={args.flatMap((a) =>
          a.premises.map((p) => ({ from: p.clauseId, to: a.conclusion.id })),
        )}
      />
    </div>
  );
}
