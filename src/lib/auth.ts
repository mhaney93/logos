import { prisma } from "@/lib/prisma";

// No login for now — everything is attributed to a single local user.
const SOLO_USER_CLERK_ID = "solo-user";

export async function getOrCreateUser() {
  return prisma.user.upsert({
    where: { clerkId: SOLO_USER_CLERK_ID },
    update: {},
    create: { clerkId: SOLO_USER_CLERK_ID, username: "me" },
  });
}

// Gates create/edit/delete of clauses and arguments since there's no login.
export function assertActionPassword(password: string) {
  if (password !== process.env.ACTION_PASSWORD) {
    throw new Error("Incorrect password");
  }
}
