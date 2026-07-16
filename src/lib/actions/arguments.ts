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

// Depth = length of the longest chain of citations feeding into an argument's
// conclusion (i.e. how many arguments deep its premises were built up from).
async function computeDeepestArgumentId(): Promise<string | null> {
  const [allArguments, citations] = await Promise.all([
    prisma.argument.findMany({ select: { id: true } }),
    prisma.citation.findMany({
      select: { citingArgumentId: true, citedArgumentId: true },
    }),
  ]);
  if (allArguments.length === 0) return null;

  const citedBy = new Map<string, string[]>();
  for (const { citingArgumentId, citedArgumentId } of citations) {
    const list = citedBy.get(citingArgumentId) ?? [];
    list.push(citedArgumentId);
    citedBy.set(citingArgumentId, list);
  }

  const depthCache = new Map<string, number>();
  function depthOf(id: string, stack: Set<string>): number {
    if (depthCache.has(id)) return depthCache.get(id)!;
    if (stack.has(id)) return 0; // guard against cycles
    stack.add(id);
    const citedIds = citedBy.get(id) ?? [];
    const depth =
      citedIds.length === 0
        ? 0
        : 1 + Math.max(...citedIds.map((citedId) => depthOf(citedId, stack)));
    stack.delete(id);
    depthCache.set(id, depth);
    return depth;
  }

  let deepestId = allArguments[0].id;
  let deepestDepth = -1;
  for (const { id } of allArguments) {
    const depth = depthOf(id, new Set());
    if (depth > deepestDepth) {
      deepestDepth = depth;
      deepestId = id;
    }
  }
  return deepestId;
}

export async function getDeepestArgument() {
  const deepestId = await computeDeepestArgumentId();
  if (!deepestId) return null;

  return prisma.argument.findUnique({
    where: { id: deepestId },
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
