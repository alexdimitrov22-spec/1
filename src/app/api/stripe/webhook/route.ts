/**
 * Stripe webhook — Stripe calls this URL to tell us what happened.
 * Point a webhook endpoint at  https://YOUR-DOMAIN/api/stripe/webhook
 * and copy its signing secret into STRIPE_WEBHOOK_SECRET.
 *
 * We ALWAYS verify the signature so only real Stripe events are trusted.
 */
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { confirmBookingPaid } from "@/server/booking-lifecycle";
import { refreshOnboardingStatus } from "@/server/stripe-connect";

// Stripe needs the raw, unparsed body to check the signature.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json(
      { error: `Signature check failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.kind === "rental" && pi.metadata.bookingId) {
        await confirmBookingPaid(pi.metadata.bookingId);
      }
      break;
    }
    case "payment_intent.amount_capturable_updated": {
      // Deposit hold successfully authorised (manual capture).
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.kind === "deposit" && pi.metadata.bookingId) {
        await prisma.deposit.updateMany({
          where: { bookingId: pi.metadata.bookingId },
          data: { status: "HELD", heldAt: new Date() },
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      if (pi.metadata?.bookingId) {
        await prisma.payment.updateMany({
          where: { bookingId: pi.metadata.bookingId },
          data: { status: "FAILED" },
        });
      }
      break;
    }
    case "invoice.paid": {
      // Pay-by-invoice (business/net-terms) booking was paid via the hosted link.
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.metadata?.kind === "rental_invoice" && invoice.metadata.bookingId) {
        await confirmBookingPaid(invoice.metadata.bookingId);
      }
      break;
    }
    case "charge.dispute.created": {
      // Renter disputed a charge — freeze the booking for manual review.
      const dispute = event.data.object as Stripe.Dispute;
      const pi = typeof dispute.payment_intent === "string" ? dispute.payment_intent : null;
      if (pi) {
        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: pi },
          select: { bookingId: true },
        });
        if (payment) {
          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: "DISPUTED" },
          });
        }
      }
      break;
    }
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await refreshOnboardingStatus(account.id);
      break;
    }
    default:
      // Unhandled events are fine to ignore.
      break;
  }

  return NextResponse.json({ received: true });
}
