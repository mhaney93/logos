"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword, getOrCreateUser } from "@/lib/auth";
import { getArgumentForm, type ArgumentFormId } from "@/lib/argumentForms";

function assertValidShape(
  form: ArgumentFormId,
  premiseClauseIds: string[],
  conclusionClauseId: string,
) {
  if (premiseClauseIds.includes(conclusionClauseId)) {
    throw new Error("A clause can't be both a premise and the conclusion");
  }
  const { minPremises, maxPremises, label } = getArgumentForm(form);
  if (
    premiseClauseIds.length < minPremises ||
    (maxPremises !== null && premiseClauseIds.length > maxPremises)
  ) {
    const expected =
      maxPremises === null
        ? `at least ${minPremises}`
        : minPremises === maxPremises
          ? `exactly ${minPremises}`
          : `${minPremises}-${maxPremises}`;
    throw new Error(`${label} requires ${expected} premise(s)`);
  }
}

export async function createArgument(
  form: ArgumentFormId,
  premiseClauseIds: string[],
  conclusionClauseId: string,
  password: string,
) {
  assertActionPassword(password);
  assertValidShape(form, premiseClauseIds, conclusionClauseId);

  const user = await getOrCreateUser();

  // Premises that are themselves the conclusion of an earlier argument —
  // using them here cites that argument.
  const citedArguments = await prisma.argument.findMany({
    where: { conclusionId: { in: premiseClauseIds } },
    select: { id: true },
  });

  const argument = await prisma.argument.create({
    data: {
      form,
      authorId: user.id,
      conclusionId: conclusionClauseId,
      premises: {
        create: premiseClauseIds.map((clauseId, position) => ({
          clauseId,
          position,
        })),
      },
    },
  });

  if (citedArguments.length > 0) {
    await prisma.citation.createMany({
      data: citedArguments.map((cited) => ({
        citingArgumentId: argument.id,
        citedArgumentId: cited.id,
      })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/arguments");
  revalidatePath("/clauses");
  return argument;
}

export async function updateArgument(
  argumentId: string,
  form: ArgumentFormId,
  premiseClauseIds: string[],
  conclusionClauseId: string,
  password: string,
) {
  assertActionPassword(password);
  assertValidShape(form, premiseClauseIds, conclusionClauseId);

  const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
  if (!existing) throw new Error("Argument not found");

  const citedArguments = await prisma.argument.findMany({
    where: { conclusionId: { in: premiseClauseIds }, id: { not: argumentId } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.argument.update({
      where: { id: argumentId },
      data: { form, conclusionId: conclusionClauseId },
    }),
    prisma.argumentPremise.deleteMany({ where: { argumentId } }),
    prisma.argumentPremise.createMany({
      data: premiseClauseIds.map((clauseId, position) => ({
        argumentId,
        clauseId,
        position,
      })),
    }),
    prisma.citation.deleteMany({ where: { citingArgumentId: argumentId } }),
    ...(citedArguments.length > 0
      ? [
          prisma.citation.createMany({
            data: citedArguments.map((cited) => ({
              citingArgumentId: argumentId,
              citedArgumentId: cited.id,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  revalidatePath("/arguments");
  revalidatePath("/clauses");
}

export async function deleteArgument(argumentId: string, password: string) {
  assertActionPassword(password);

  const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
  if (!existing) throw new Error("Argument not found");

  await prisma.argument.delete({ where: { id: argumentId } });

  revalidatePath("/arguments");
  revalidatePath("/clauses");
}

export async function listArguments() {
  return prisma.argument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { username: true } },
      conclusion: true,
      premises: {
        orderBy: { position: "asc" },
        include: { clause: true },
      },
      _count: { select: { citationsReceived: true } },
    },
  });
}

// The set of categories an argument "bridges" is the category of its
// conclusion plus the categories of its premises — and, transitively, the
// categories bridged by whichever earlier arguments concluded those premises
// (a premise that's itself a conclusion pulls in everything that fed into it).
async function computeMostCategoryBridgingArgumentId(): Promise<string | null> {
  const [allArguments, premiseRows, clauses] = await Promise.all([
    prisma.argument.findMany({ select: { id: true, conclusionId: true } }),
    prisma.argumentPremise.findMany({ select: { argumentId: true, clauseId: true } }),
    prisma.clause.findMany({ select: { id: true, categoryId: true } }),
  ]);
  if (allArguments.length === 0) return null;

  const conclusionByArgumentId = new Map(allArguments.map((a) => [a.id, a.conclusionId]));
  const argumentByConclusionClauseId = new Map(allArguments.map((a) => [a.conclusionId, a.id]));
  const categoryIdByClauseId = new Map(clauses.map((c) => [c.id, c.categoryId]));

  const premisesByArgument = new Map<string, string[]>();
  for (const { argumentId, clauseId } of premiseRows) {
    const list = premisesByArgument.get(argumentId) ?? [];
    list.push(clauseId);
    premisesByArgument.set(argumentId, list);
  }

  const categoriesCache = new Map<string, Set<string>>();
  function categoriesOf(argumentId: string, stack: Set<string>): Set<string> {
    if (categoriesCache.has(argumentId)) return categoriesCache.get(argumentId)!;
    if (stack.has(argumentId)) return new Set(); // guard against cycles
    stack.add(argumentId);

    const categories = new Set<string>();
    const conclusionClauseId = conclusionByArgumentId.get(argumentId);
    const conclusionCategoryId = conclusionClauseId && categoryIdByClauseId.get(conclusionClauseId);
    if (conclusionCategoryId) categories.add(conclusionCategoryId);

    for (const premiseClauseId of premisesByArgument.get(argumentId) ?? []) {
      const premiseCategoryId = categoryIdByClauseId.get(premiseClauseId);
      if (premiseCategoryId) categories.add(premiseCategoryId);

      const subArgumentId = argumentByConclusionClauseId.get(premiseClauseId);
      if (subArgumentId) {
        for (const categoryId of categoriesOf(subArgumentId, stack)) categories.add(categoryId);
      }
    }

    stack.delete(argumentId);
    categoriesCache.set(argumentId, categories);
    return categories;
  }

  let bestId = allArguments[0].id;
  let bestCount = -1;
  for (const { id } of allArguments) {
    const count = categoriesOf(id, new Set()).size;
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
}

export async function getMostCategoryBridgingArgument() {
  const bestId = await computeMostCategoryBridgingArgumentId();
  if (!bestId) return null;

  return prisma.argument.findUnique({
    where: { id: bestId },
    include: {
      author: { select: { username: true } },
      conclusion: true,
      premises: {
        orderBy: { position: "asc" },
        include: { clause: true },
      },
      _count: { select: { citationsReceived: true } },
    },
  });
}
