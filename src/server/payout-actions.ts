"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createOnboardingLink } from "@/server/stripe-connect";

/**
 * Kick off (or resume) Stripe Connect onboarding so a lender can receive
 * payouts. Redirects to Stripe's hosted flow; they return to the dashboard.
 */
export async function startPayoutOnboarding() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const url = await createOnboardingLink(
    session.user.id,
    `${base}/dashboard?payouts=done`,
    `${base}/dashboard?payouts=refresh`,
  );
  redirect(url);
}
