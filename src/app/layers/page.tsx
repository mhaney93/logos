import { listLayers } from "@/lib/actions/layers";
import { LayerForm } from "./LayerForm";
import { LayerList } from "./LayerList";

export const dynamic = "force-dynamic";

export default async function LayersPage() {
  const layers = await listLayers();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Layers</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Layers of analysis, ordered from most fundamental (depth 1) outward. An
          argument&apos;s premises must belong to a layer at least as fundamental as its
          conclusion&apos;s layer.
        </p>
      </div>

      <LayerForm existingDepths={layers.map((l) => l.depth)} />

      <LayerList layers={layers} />
    </div>
  );
}
