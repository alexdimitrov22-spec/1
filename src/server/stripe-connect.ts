/**
 * Stripe Connect — lets each lender (owner) get paid.
 *
 * Flow:
 *   1. Lender clicks "Set up payouts" -> createConnectAccount + createOnboardingLink
 *   2. They complete Stripe's hosted onboarding (ID, bank details) on Stripe's site
 *   3. Stripe fires `account.updated`; we flip stripeConnectOnboarded to true
 *   4. When a rental completes, payOutOwner() transfers their share (minus fee)
 *
 * Nothing here ever touches the lender's bank credentials — Stripe collects
 * those on its own hosted pages. We only store the resulting account id.
 */
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { ownerPayoutCents } from "@/lib/money";

/** Create (once) a Stripe Express account for a lender and remember its id. */
export async function createConnectAccount(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.stripeConnectAccountId) return user.stripeConnectAccountId;

  const account = await stripe.accounts.create({
    type: "express",
    email: user.email ?? undefined,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    business_type: "individual",
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeConnectAccountId: account.id },
  });
  return account.id;
}

/** Hosted onboarding URL the lender is redirected to. Links expire, so mint fresh. */
export async function createOnboardingLink(
  userId: string,
  returnUrl: string,
  refreshUrl: string,
) {
  const accountId = await createConnectAccount(userId);
  const link = await stripe.accountLinks.create({
    account: accountId,
    return_url: returnUrl,
    refresh_url: refreshUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/** Called from the account.updated webhook (and can be polled) to record status. */
export async function refreshOnboardingStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  const ready = Boolean(account.charges_enabled && account.payouts_enabled);
  await prisma.user.updateMany({
    where: { stripeConnectAccountId: accountId },
    data: { stripeConnectOnboarded: ready },
  });
  return ready;
}

/**
 * Move the owner's share out of escrow once a rental is complete.
 * Platform keeps the fee automatically because we only transfer the payout
 * amount, not the fee.
 */
export async function payOutOwner(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { owner: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (!booking.owner.stripeConnectAccountId || !booking.owner.stripeConnectOnboarded) {
    throw new Error("Owner has not finished payout setup");
  }

  const amount = ownerPayoutCents({
    rentalSubtotalCents: booking.rentalSubtotalCents,
    platformFeeCents: booking.platformFeeCents,
  });

  const transfer = await stripe.transfers.create({
    amount,
    currency: booking.currency.toLowerCase(),
    destination: booking.owner.stripeConnectAccountId,
    transfer_group: booking.code,
    metadata: { bookingId },
  });

  await prisma.$transaction([
    prisma.payout.create({
      data: {
        ownerId: booking.ownerId,
        bookingId,
        stripeTransferId: transfer.id,
        amountCents: amount,
        currency: booking.currency,
        status: "IN_TRANSIT",
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        bookingId,
        userId: booking.ownerId,
        type: "PAYOUT",
        direction: "DEBIT",
        amountCents: amount,
        currency: booking.currency,
        stripeRef: transfer.id,
      },
    }),
  ]);

  return transfer;
}
