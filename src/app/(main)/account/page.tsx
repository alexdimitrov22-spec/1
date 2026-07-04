import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldAlert, Wallet, CheckCircle2, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyIdentityStub } from "@/server/account-actions";
import { startPayoutOnboarding } from "@/server/payout-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/account");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true },
  });
  if (!user) redirect("/sign-in");

  const verified = user.profile?.identityVerified ?? false;

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">Account</h1>

      {/* Profile */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-lg font-semibold text-accent">
            {(user.name ?? user.email ?? "?").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-ink">{user.name ?? "—"}</p>
            <p className="text-sm text-muted-fg">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {verified ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 text-accent" />
            ) : (
              <ShieldAlert className="mt-0.5 h-5 w-5 text-warn" />
            )}
            <div>
              <p className="flex items-center gap-2 font-medium text-ink">
                Identity{" "}
                {verified ? (
                  <Badge variant="default">Verified</Badge>
                ) : (
                  <Badge variant="warn">Not verified</Badge>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-fg">
                {verified
                  ? "You're verified and can book and list gear."
                  : "Verification is required before booking or listing. (Placeholder for Stripe Identity — Phase 5.)"}
              </p>
            </div>
          </div>
          {!verified && (
            <form action={verifyIdentityStub}>
              <Button type="submit" size="sm">
                Verify now
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Payouts */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="flex items-center gap-2 font-medium text-ink">
                Payouts{" "}
                {user.stripeConnectOnboarded ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="neutral">Not set up</Badge>
                )}
              </p>
              <p className="mt-1 text-sm text-muted-fg">
                {user.stripeConnectOnboarded
                  ? "Your Stripe payout account is connected."
                  : "Connect a bank account via Stripe to receive rental earnings."}
              </p>
            </div>
          </div>
          {!user.stripeConnectOnboarded && (
            <form action={startPayoutOnboarding}>
              <Button type="submit" size="sm" variant="outline">
                Set up <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 text-sm text-muted-fg">
        <CheckCircle2 className="h-4 w-4 text-accent" />
        <Link href="/dashboard" className="text-accent hover:underline">
          Go to your lender dashboard
        </Link>
      </div>
    </div>
  );
}
