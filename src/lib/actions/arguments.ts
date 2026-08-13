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

// Explanatory power flows inward-out: a premise must belong to a layer at
// least as fundamental (depth <= conclusion's depth) as what it supports.
async function assertValidLayers(premiseClauseIds: string[], conclusionClauseId: string) {
  const clauses = await prisma.clause.findMany({
    where: { id: { in: [...premiseClauseIds, conclusionClauseId] } },
    include: { layer: true },
  });
  const byId = new Map(clauses.map((c) => [c.id, c]));

  const conclusion = byId.get(conclusionClauseId);
  if (!conclusion) throw new Error("Conclusion clause not found");

  for (const premiseId of premiseClauseIds) {
    const premise = byId.get(premiseId);
    if (!premise) throw new Error("Premise clause not found");
    if (premise.layer.depth > conclusion.layer.depth) {
      throw new Error(
        `Premise "${premise.text}" (${premise.layer.name}) is less fundamental than conclusion "${conclusion.text}" (${conclusion.layer.name})`,
      );
    }
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
  await assertValidLayers(premiseClauseIds, conclusionClauseId);

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
  await assertValidLayers(premiseClauseIds, conclusionClauseId);

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

// The set of layers an argument "bridges" is the layer of its conclusion plus
// the layers of its premises — and, transitively, the layers bridged by
// whichever earlier arguments concluded those premises (a premise that's
// itself a conclusion pulls in everything that fed into it).
async function computeMostLayerBridgingArgumentId(): Promise<string | null> {
  const [allArguments, premiseRows, clauses] = await Promise.all([
    prisma.argument.findMany({ select: { id: true, conclusionId: true } }),
    prisma.argumentPremise.findMany({ select: { argumentId: true, clauseId: true } }),
    prisma.clause.findMany({ select: { id: true, layerId: true } }),
  ]);
  if (allArguments.length === 0) return null;

  const conclusionByArgumentId = new Map(allArguments.map((a) => [a.id, a.conclusionId]));
  const argumentByConclusionClauseId = new Map(allArguments.map((a) => [a.conclusionId, a.id]));
  const layerIdByClauseId = new Map(clauses.map((c) => [c.id, c.layerId]));

  const premisesByArgument = new Map<string, string[]>();
  for (const { argumentId, clauseId } of premiseRows) {
    const list = premisesByArgument.get(argumentId) ?? [];
    list.push(clauseId);
    premisesByArgument.set(argumentId, list);
  }

  const layersCache = new Map<string, Set<string>>();
  function layersOf(argumentId: string, stack: Set<string>): Set<string> {
    if (layersCache.has(argumentId)) return layersCache.get(argumentId)!;
    if (stack.has(argumentId)) return new Set(); // guard against cycles
    stack.add(argumentId);

    const layers = new Set<string>();
    const conclusionClauseId = conclusionByArgumentId.get(argumentId);
    const conclusionLayerId = conclusionClauseId && layerIdByClauseId.get(conclusionClauseId);
    if (conclusionLayerId) layers.add(conclusionLayerId);

    for (const premiseClauseId of premisesByArgument.get(argumentId) ?? []) {
      const premiseLayerId = layerIdByClauseId.get(premiseClauseId);
      if (premiseLayerId) layers.add(premiseLayerId);

      const subArgumentId = argumentByConclusionClauseId.get(premiseClauseId);
      if (subArgumentId) {
        for (const layerId of layersOf(subArgumentId, stack)) layers.add(layerId);
      }
    }

    stack.delete(argumentId);
    layersCache.set(argumentId, layers);
    return layers;
  }

  let bestId = allArguments[0].id;
  let bestCount = -1;
  for (const { id } of allArguments) {
    const count = layersOf(id, new Set()).size;
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
}

export async function getMostLayerBridgingArgument() {
  const bestId = await computeMostLayerBridgingArgumentId();
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
