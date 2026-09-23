"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword, getOrCreateUser } from "@/lib/auth";
import { runAction } from "./actionResult";

export async function createClause(text: string, password: string) {
  return runAction(async () => {
    assertActionPassword(password);

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Clause text is required");

    const user = await getOrCreateUser();
    if (!user) throw new Error("Not signed in");

    const clause = await prisma.clause.create({
      data: { text: trimmed, authorId: user.id },
    });

    revalidatePath("/clauses");
    return clause;
  });
}

export async function updateClause(id: string, text: string, password: string) {
  return runAction(async () => {
    assertActionPassword(password);

    const trimmed = text.trim();
    if (!trimmed) throw new Error("Clause text is required");

    const clause = await prisma.clause.findUnique({ where: { id } });
    if (!clause) throw new Error("Clause not found");

    const updated = await prisma.clause.update({
      where: { id },
      data: { text: trimmed },
    });

    revalidatePath("/clauses");
    revalidatePath("/arguments");
    return updated;
  });
}

export async function updateClauseDetails(
  id: string,
  support: string,
  category: string,
  password: string,
) {
  return runAction(async () => {
    assertActionPassword(password);

    const trimmed = support.trim();
    const path = category
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .join("/");

    const clause = await prisma.clause.findUnique({ where: { id } });
    if (!clause) throw new Error("Clause not found");

    const updated = await prisma.clause.update({
      where: { id },
      data: { support: trimmed || null, category: path || null },
    });

    revalidatePath("/clauses");
    revalidatePath("/");
    return updated;
  });
}

export async function deleteClause(id: string, password: string) {
  return runAction(async () => {
    assertActionPassword(password);

    const clause = await prisma.clause.findUnique({
      where: { id },
      include: {
        _count: { select: { premiseOf: true } },
        concludedBy: { select: { id: true } },
      },
    });
    if (!clause) throw new Error("Clause not found");
    if (clause._count.premiseOf > 0 || clause.concludedBy) {
      throw new Error("Can't delete a clause that's used in an argument");
    }

    await prisma.clause.delete({ where: { id } });

    revalidatePath("/clauses");
    revalidatePath("/arguments");
  });
}

export async function listClauses() {
  return prisma.clause.findMany({
    orderBy: { createdAt: "desc" },
  });
}
