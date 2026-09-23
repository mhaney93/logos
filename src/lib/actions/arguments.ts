"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertActionPassword, getOrCreateUser } from "@/lib/auth";
import { runAction } from "./actionResult";

function assertValidShape(premiseClauseIds: string[], conclusionClauseId: string) {
  if (premiseClauseIds.length === 0) {
    throw new Error("An argument needs at least one premise");
  }
  if (new Set(premiseClauseIds).size !== premiseClauseIds.length) {
    throw new Error("A clause can't be used as a premise twice");
  }
  if (premiseClauseIds.includes(conclusionClauseId)) {
    throw new Error("A clause can't be both a premise and the conclusion");
  }
}

export async function createArgument(
  premiseClauseIds: string[],
  conclusionClauseId: string,
  password: string,
) {
  return runAction(async () => {
    assertActionPassword(password);
    assertValidShape(premiseClauseIds, conclusionClauseId);

    const existingConclusion = await prisma.argument.findUnique({
      where: { conclusionId: conclusionClauseId },
    });
    if (existingConclusion) {
      throw new Error("That clause is already the conclusion of another argument");
    }

    const user = await getOrCreateUser();

    // Premises that are themselves the conclusion of an earlier argument —
    // using them here cites that argument.
    const citedArguments = await prisma.argument.findMany({
      where: { conclusionId: { in: premiseClauseIds } },
      select: { id: true },
    });

    const argument = await prisma.argument.create({
      data: {
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

    // Backfill: other arguments that already used this clause as a premise
    // (published before this clause had a concluding argument) now cite it.
    const priorUsers = await prisma.argumentPremise.findMany({
      where: { clauseId: conclusionClauseId, argumentId: { not: argument.id } },
      select: { argumentId: true },
    });
    if (priorUsers.length > 0) {
      await prisma.citation.createMany({
        data: priorUsers.map((p) => ({
          citingArgumentId: p.argumentId,
          citedArgumentId: argument.id,
        })),
        skipDuplicates: true,
      });
    }

    revalidatePath("/arguments");
    revalidatePath("/clauses");
    return argument;
  });
}

export async function updateArgument(
  argumentId: string,
  premiseClauseIds: string[],
  conclusionClauseId: string,
  password: string,
) {
  return runAction(async () => {
    assertActionPassword(password);
    assertValidShape(premiseClauseIds, conclusionClauseId);

    const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
    if (!existing) throw new Error("Argument not found");

    const existingConclusion = await prisma.argument.findUnique({
      where: { conclusionId: conclusionClauseId },
    });
    if (existingConclusion && existingConclusion.id !== argumentId) {
      throw new Error("That clause is already the conclusion of another argument");
    }

    const citedArguments = await prisma.argument.findMany({
      where: { conclusionId: { in: premiseClauseIds }, id: { not: argumentId } },
      select: { id: true },
    });

    // Backfill: other arguments that already used the (possibly new)
    // conclusion clause as a premise now cite this one.
    const priorUsers = await prisma.argumentPremise.findMany({
      where: { clauseId: conclusionClauseId, argumentId: { not: argumentId } },
      select: { argumentId: true },
    });

    await prisma.$transaction([
      prisma.argument.update({
        where: { id: argumentId },
        data: { conclusionId: conclusionClauseId },
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
      ...(priorUsers.length > 0
        ? [
            prisma.citation.createMany({
              data: priorUsers.map((p) => ({
                citingArgumentId: p.argumentId,
                citedArgumentId: argumentId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    revalidatePath("/arguments");
    revalidatePath("/clauses");
  });
}

export async function deleteArgument(argumentId: string, password: string) {
  return runAction(async () => {
    assertActionPassword(password);

    const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
    if (!existing) throw new Error("Argument not found");

    await prisma.argument.delete({ where: { id: argumentId } });

    revalidatePath("/arguments");
    revalidatePath("/clauses");
  });
}

export async function listArguments() {
  return prisma.argument.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      conclusion: true,
      premises: {
        orderBy: { position: "asc" },
        include: { clause: true },
      },
      _count: { select: { citationsReceived: true } },
    },
  });
}
