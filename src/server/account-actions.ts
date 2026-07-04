"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Placeholder identity check standing in for Phase 5's Stripe Identity flow.
 * Marks the current user verified so the booking loop can be exercised
 * end-to-end in test mode. Replace with a real Stripe Identity session before
 * going live.
 */
export async function verifyIdentityStub() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account");

  await prisma.$transaction([
    prisma.profile.update({
      where: { userId: session.user.id },
      data: { identityVerified: true },
    }),
    prisma.identityVerification.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        status: "VERIFIED",
        provider: "manual",
        reviewedAt: new Date(),
      },
      update: { status: "VERIFIED", provider: "manual", reviewedAt: new Date() },
    }),
  ]);

  revalidatePath("/account");
}
