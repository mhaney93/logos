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

export async function createClause(
  text: string,
  layerId: string,
  categoryId: string,
  password: string,
) {
  assertActionPassword(password);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Clause text is required");
  if (!layerId) throw new Error("A layer is required");
  if (!categoryId) throw new Error("A category is required");

  const user = await getOrCreateUser();
  if (!user) throw new Error("Not signed in");

  const clause = await prisma.clause.create({
    data: { text: trimmed, authorId: user.id, layerId, categoryId },
  });

  await storeEmbedding(clause.id, trimmed);

  revalidatePath("/clauses");
  revalidatePath("/layers");
  return clause;
}

export async function updateClause(
  id: string,
  text: string,
  layerId: string,
  categoryId: string,
  password: string,
) {
  assertActionPassword(password);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Clause text is required");
  if (!layerId) throw new Error("A layer is required");
  if (!categoryId) throw new Error("A category is required");

  const clause = await prisma.clause.findUnique({ where: { id } });
  if (!clause) throw new Error("Clause not found");

  if (clause.layerId !== layerId) {
    // Changing a clause's layer can invalidate arguments built on it —
    // any argument concluding this clause must still keep its premises
    // at least as fundamental as the new layer.
    const argument = await prisma.argument.findUnique({
      where: { conclusionId: id },
      include: { premises: { include: { clause: { include: { layer: true } } } } },
    });
    if (argument) {
      const newLayer = await prisma.layer.findUnique({ where: { id: layerId } });
      if (!newLayer) throw new Error("Layer not found");
      const violator = argument.premises.find((p) => p.clause.layer.depth > newLayer.depth);
      if (violator) {
        throw new Error(
          `Can't move to a layer more fundamental than premise "${violator.clause.text}"`,
        );
      }
    }
  }

  const updated = await prisma.clause.update({
    where: { id },
    data: { text: trimmed, layerId, categoryId },
  });

  await storeEmbedding(id, trimmed);

  revalidatePath("/clauses");
  revalidatePath("/arguments");
  revalidatePath("/layers");
  revalidatePath("/categories");
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
    include: { author: { select: { username: true } }, layer: true, category: true },
  });
}
