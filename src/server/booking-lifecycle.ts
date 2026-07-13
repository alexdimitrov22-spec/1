/**
 * Booking lifecycle — the state changes that happen after the renter pays.
 * These are called by the Stripe webhook (on payment success) and by the
 * return/condition flow (on completion or damage).
 */
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { payOutOwner } from "@/server/stripe-connect";

/** Rental PaymentIntent succeeded -> funds are held; confirm the booking. */
export async function confirmBookingPaid(bookingId: string) {
  await prisma.$transaction([
    prisma.payment.update({
      where: { bookingId },
      data: { status: "HELD_IN_ESCROW", capturedAt: new Date() },
    }),
    prisma.deposit.updateMany({
      where: { bookingId },
      data: { status: "HELD", heldAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    }),
  ]);
}

/**
 * Clean return: release the deposit hold (no money taken) and pay the owner
 * their share out of escrow. Marks the booking COMPLETED.
 */
export async function completeBooking(bookingId: string) {
  const deposit = await prisma.deposit.findUnique({ where: { bookingId } });

  // Releasing a manual-capture PaymentIntent = cancel the authorisation hold.
  if (deposit?.stripePaymentIntentId && deposit.status === "HELD") {
    await stripe.paymentIntents.cancel(deposit.stripePaymentIntentId);
    await prisma.deposit.update({
      where: { bookingId },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
    await prisma.ledgerEntry.create({
      data: {
        bookingId,
        type: "DEPOSIT_REFUND",
        direction: "CREDIT",
        amountCents: deposit.amountCents,
        currency: deposit.currency,
        meta: { note: "Deposit hold released on clean return" },
      },
    });
  }

  await payOutOwner(bookingId);

  await prisma.$transaction([
    prisma.payment.update({
      where: { bookingId },
      data: { status: "RELEASED", releasedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    }),
  ]);
}

/**
 * Damage after return: capture some or all of the held deposit. Any uncaptured
 * remainder is released back to the renter automatically by Stripe.
 */
export async function captureDeposit(bookingId: string, amountToCaptureCents: number) {
  const deposit = await prisma.deposit.findUnique({ where: { bookingId } });
  if (!deposit?.stripePaymentIntentId || deposit.status !== "HELD") {
    throw new Error("No held deposit to capture");
  }
  const capture = Math.min(amountToCaptureCents, deposit.amountCents);

  await stripe.paymentIntents.capture(deposit.stripePaymentIntentId, {
    amount_to_capture: capture,
  });

  await prisma.$transaction([
    prisma.deposit.update({
      where: { bookingId },
      data: {
        capturedCents: capture,
        status: capture >= deposit.amountCents ? "CAPTURED" : "PARTIALLY_CAPTURED",
      },
    }),
    prisma.ledgerEntry.create({
      data: {
        bookingId,
        type: "DEPOSIT_CAPTURE",
        direction: "DEBIT",
        amountCents: capture,
        currency: deposit.currency,
        stripeRef: deposit.stripePaymentIntentId,
      },
    }),
  ]);
}

/**
 * Damaged return: capture the agreed amount from the deposit hold (Stripe
 * auto-releases the uncaptured remainder), then pay the owner their rental
 * share out of escrow and mark the booking complete. Mirrors completeBooking
 * but captures instead of releasing the deposit.
 */
export async function completeBookingWithDamage(bookingId: string, damageCents: number) {
  await captureDeposit(bookingId, damageCents);

  await payOutOwner(bookingId);

  await prisma.$transaction([
    prisma.payment.update({
      where: { bookingId },
      data: { status: "RELEASED", releasedAt: new Date() },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "COMPLETED" },
    }),
  ]);
}
