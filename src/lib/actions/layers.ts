"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword } from "@/lib/auth";

export async function listLayers() {
  return prisma.layer.findMany({ orderBy: { depth: "asc" } });
}

export async function createLayer(name: string, depth: number, password: string) {
  assertActionPassword(password);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Layer name is required");
  if (!Number.isInteger(depth)) throw new Error("Depth must be an integer");

  const layer = await prisma.layer.create({ data: { name: trimmed, depth } });

  revalidatePath("/layers");
  revalidatePath("/clauses");
  return layer;
}

export async function updateLayerName(id: string, name: string, password: string) {
  assertActionPassword(password);

  const trimmed = name.trim();
  if (!trimmed) throw new Error("Layer name is required");

  const layer = await prisma.layer.findUnique({ where: { id } });
  if (!layer) throw new Error("Layer not found");

  const updated = await prisma.layer.update({ where: { id }, data: { name: trimmed } });

  revalidatePath("/layers");
  revalidatePath("/clauses");
  return updated;
}

export async function deleteLayer(id: string, password: string) {
  assertActionPassword(password);

  const layer = await prisma.layer.findUnique({
    where: { id },
    include: { _count: { select: { clauses: true } } },
  });
  if (!layer) throw new Error("Layer not found");
  if (layer._count.clauses > 0) {
    throw new Error("Can't delete a layer that has clauses assigned to it");
  }

  await prisma.layer.delete({ where: { id } });

  revalidatePath("/layers");
  revalidatePath("/clauses");
}
