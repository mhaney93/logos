"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/auth";
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
) {
  assertValidShape(form, premiseClauseIds, conclusionClauseId);

  const user = await getOrCreateUser();
  if (!user) throw new Error("Not signed in");

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
) {
  assertValidShape(form, premiseClauseIds, conclusionClauseId);

  const user = await getOrCreateUser();
  if (!user) throw new Error("Not signed in");

  const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
  if (!existing) throw new Error("Argument not found");
  if (existing.authorId !== user.id) throw new Error("Not your argument");

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

export async function deleteArgument(argumentId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Not signed in");

  const existing = await prisma.argument.findUnique({ where: { id: argumentId } });
  if (!existing) throw new Error("Argument not found");
  if (existing.authorId !== user.id) throw new Error("Not your argument");

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
