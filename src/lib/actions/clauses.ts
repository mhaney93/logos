"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword, getOrCreateUser } from "@/lib/auth";
import { embedText, toVectorLiteral } from "@/lib/embeddings";

// Embeddings power similarity search but aren't load-bearing for publishing —
// don't fail clause creation/edits if Voyage is unreachable or unconfigured.
async function storeEmbedding(clauseId: string, text: string) {
  try {
    const embedding = await embedText(text, "document");
    await prisma.$executeRaw`
      UPDATE "clauses" SET "embedding" = ${toVectorLiteral(embedding)}::vector
      WHERE "id" = ${clauseId}
    `;
  } catch (err) {
    console.error("Failed to embed clause", clauseId, err);
  }
}

export async function createClause(text: string, password: string) {
  assertActionPassword(password);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Clause text is required");

  const user = await getOrCreateUser();
  if (!user) throw new Error("Not signed in");

  const clause = await prisma.clause.create({
    data: { text: trimmed, authorId: user.id },
  });

  await storeEmbedding(clause.id, trimmed);

  revalidatePath("/clauses");
  return clause;
}

export async function updateClause(id: string, text: string, password: string) {
  assertActionPassword(password);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Clause text is required");

  const clause = await prisma.clause.findUnique({ where: { id } });
  if (!clause) throw new Error("Clause not found");

  const updated = await prisma.clause.update({
    where: { id },
    data: { text: trimmed },
  });

  await storeEmbedding(id, trimmed);

  revalidatePath("/clauses");
  revalidatePath("/arguments");
  return updated;
}

export async function updateClauseSupport(id: string, support: string, password: string) {
  assertActionPassword(password);

  const trimmed = support.trim();

  const clause = await prisma.clause.findUnique({ where: { id } });
  if (!clause) throw new Error("Clause not found");

  const updated = await prisma.clause.update({
    where: { id },
    data: { support: trimmed || null },
  });

  revalidatePath("/clauses");
  return updated;
}

export async function deleteClause(id: string, password: string) {
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
}

export async function findSimilarClauses(text: string) {
  const trimmed = text.trim();
  if (trimmed.length < 8) return [];

  let embedding: number[];
  try {
    embedding = await embedText(trimmed, "query");
  } catch (err) {
    console.error("Failed to embed query", err);
    return [];
  }

  return prisma.$queryRaw<{ id: string; text: string; distance: number }[]>`
    SELECT "id", "text", "embedding" <=> ${toVectorLiteral(embedding)}::vector AS distance
    FROM "clauses"
    WHERE "embedding" IS NOT NULL
    ORDER BY distance ASC
    LIMIT 5
  `;
}

export async function listClauses() {
  return prisma.clause.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { username: true } } },
  });
}
