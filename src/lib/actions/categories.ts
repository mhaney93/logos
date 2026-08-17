"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword } from "@/lib/auth";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(name: string, parentId: string | null, password: string) {
  assertActionPassword(password);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const category = await prisma.category.create({ data: { name: trimmed, parentId } });

  revalidatePath("/categories");
  revalidatePath("/clauses");
  return category;
}

export async function updateCategoryName(id: string, name: string, password: string) {
  assertActionPassword(password);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw new Error("Category not found");

  const updated = await prisma.category.update({ where: { id }, data: { name: trimmed } });

  revalidatePath("/categories");
  revalidatePath("/clauses");
  return updated;
}

export async function deleteCategory(id: string, password: string) {
  assertActionPassword(password);

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { clauses: true, children: true } } },
  });
  if (!category) throw new Error("Category not found");
  if (category._count.clauses > 0) {
    throw new Error("Can't delete a category that has clauses assigned to it");
  }
  if (category._count.children > 0) {
    throw new Error("Can't delete a category that has subcategories");
  }

  await prisma.category.delete({ where: { id } });

  revalidatePath("/categories");
  revalidatePath("/clauses");
}
