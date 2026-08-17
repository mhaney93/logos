import Link from "next/link";
import { listClauses } from "@/lib/actions/clauses";
import { listCategories } from "@/lib/actions/categories";
import { categoryAndDescendantIds } from "@/lib/categoryTree";
import { ClauseForm } from "./ClauseForm";
import { ClauseList } from "./ClauseList";
import { CategoryFilter } from "./CategoryFilter";

export const dynamic = "force-dynamic";

export default async function ClausesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: categoryFilter } = await searchParams;
  const categories = await listCategories();

  const categoryIds = categoryFilter
    ? categoryAndDescendantIds(categories, categoryFilter)
    : undefined;
  const clauses = await listClauses(categoryIds);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-8 py-12">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Clauses</h1>
        {categories.length > 0 && <CategoryFilter categories={categories} />}
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No categories yet —{" "}
          <Link href="/categories" className="underline">
            create a category
          </Link>{" "}
          before publishing clauses.
        </p>
      ) : (
        <ClauseForm categories={categories} />
      )}

      <ClauseList clauses={clauses} categories={categories} />
    </div>
  );
}
