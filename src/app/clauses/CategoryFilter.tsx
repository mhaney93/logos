"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { flattenCategoryTree } from "@/lib/categoryTree";

export function CategoryFilter({
  categories,
}: {
  categories: { id: string; name: string; parentId: string | null }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = searchParams.get("category") ?? "";
  const tree = flattenCategoryTree(categories);

  return (
    <select
      value={selected}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        if (e.target.value) {
          params.set("category", e.target.value);
        } else {
          params.delete("category");
        }
        router.push(`/clauses?${params.toString()}`);
      }}
      className="rounded-full border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
    >
      <option value="">All categories</option>
      {tree.map((category) => (
        <option key={category.id} value={category.id}>
          {"—".repeat(category.depth)} {category.name}
        </option>
      ))}
    </select>
  );
}
