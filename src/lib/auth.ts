import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Ensures the signed-in Clerk user has a corresponding row in our User
// table, since we don't have a Clerk webhook syncing users on signup yet.
export async function getOrCreateUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const username =
    clerkUser.username ??
    clerkUser.emailAddresses[0]?.emailAddress.split("@")[0] ??
    clerkUser.id;

  return prisma.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {},
    create: { clerkId: clerkUser.id, username },
  });
}
