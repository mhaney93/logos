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
          Topical groupings for clauses — e.g. metaphysics vs. metaethics — independent of
          layer. Two categories can sit at the same depth.
        </p>
      </div>

      <CategoryForm />

      <CategoryList categories={categories} />
    </div>
  );
}
