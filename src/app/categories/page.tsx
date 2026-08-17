import { listCategories } from "@/lib/actions/categories";
import { CategoryForm } from "./CategoryForm";
import { CategoryList } from "./CategoryList";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Topical groupings for clauses, independent of layer, organized as a tree —
          e.g. Philosophy &gt; Metaphysics &gt; Metaethics. Filtering by a category includes
          all of its subcategories.
        </p>
      </div>

      <CategoryForm categories={categories} />

      <CategoryList categories={categories} />
    </div>
  );
}
