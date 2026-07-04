/**
 * Stripe Invoicing for Revio.
 *
 * Three real uses in a rental marketplace:
 *   1. ensureStripeCustomer  — every payer needs a Stripe Customer so invoices,
 *      receipts and saved cards work. (Also fixes a gap in booking-service.)
 *   2. createRentalInvoice    — "pay by invoice" for BUSINESS renters who want
 *      net-terms + a proper VAT invoice instead of an instant card hold.
 *      ⚠️ Use this INSTEAD of the card PaymentIntent for that booking — never
 *      both, or the renter is charged twice.
 *   3. createPaidReceiptInvoice — a formal VAT receipt for a card booking that
 *      was ALREADY paid. It records the payment (paid_out_of_band); it does NOT
 *      charge again.
 *   4. createLenderFeeInvoice — optionally bill a lender for accrued platform
 *      fees over a period (only if you ever charge fees separately rather than
 *      skimming them per-transaction).
 *
 * All invoices are raised on the PLATFORM account (you are the merchant of
 * record for the rental), which matches the escrow model in booking-service.
 */
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/** Get-or-create the Stripe Customer for a user, and remember its id. */
export async function ensureStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create(
    {
      email: user.email ?? undefined,
      name: user.profile?.displayName ?? user.name ?? undefined,
      metadata: { userId },
    },
    { idempotencyKey: `customer:${userId}` },
  );

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Line items shared by both invoice types, built from a booking. */
async function bookingLineItems(customerId: string, booking: {
  id: string; code: string; currency: string;
  rentalSubtotalCents: number; platformFeeCents: number;
  deliveryFeeCents: number; taxCents: number;
}) {
  const currency = booking.currency.toLowerCase();
  const items: Array<{ description: string; amount: number }> = [
    { description: `Rental — booking ${booking.code}`, amount: booking.rentalSubtotalCents },
    { description: "Service fee", amount: booking.platformFeeCents },
  ];
  if (booking.deliveryFeeCents > 0) items.push({ description: "Delivery", amount: booking.deliveryFeeCents });
  if (booking.taxCents > 0) items.push({ description: "VAT", amount: booking.taxCents });

  for (const [i, item] of items.entries()) {
    await stripe.invoiceItems.create(
      { customer: customerId, amount: item.amount, currency, description: item.description },
      { idempotencyKey: `invitem:${booking.id}:${i}` },
    );
  }
}

/**
 * Pay-by-invoice checkout for a business/net-terms renter.
 * Returns the hosted invoice URL to send them. They pay via that link.
 * Do NOT also create the card PaymentIntent for this booking.
 */
export async function createRentalInvoice(bookingId: string, opts: { daysUntilDue?: number } = {}) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found");

  const customerId = await ensureStripeCustomer(booking.renterId);
  await bookingLineItems(customerId, booking);

  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: opts.daysUntilDue ?? 14,
      metadata: { bookingId, kind: "rental_invoice" },
      // Note: the refundable deposit still needs a separate card hold — invoices
      // can't place an authorisation hold, so collect the deposit at handover.
    },
    { idempotencyKey: `invoice:${bookingId}` },
  );

  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

  await prisma.ledgerEntry.create({
    data: {
      bookingId,
      userId: booking.renterId,
      type: "RENT_CHARGE",
      direction: "CREDIT",
      amountCents: finalized.amount_due,
      currency: booking.currency,
      stripeRef: finalized.id,
      meta: { note: "Pay-by-invoice raised", hostedUrl: finalized.hosted_invoice_url },
    },
  });

  return {
    invoiceId: finalized.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url,
    invoicePdf: finalized.invoice_pdf,
    amountDue: finalized.amount_due,
  };
}

/**
 * A formal VAT receipt for a booking already paid by card.
 * Records the payment as out-of-band (it was taken via the PaymentIntent) so no
 * second charge happens — this is purely the document the renter can keep.
 */
export async function createPaidReceiptInvoice(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found");

  const customerId = await ensureStripeCustomer(booking.renterId);
  await bookingLineItems(customerId, booking);

  const invoice = await stripe.invoices.create(
    {
      customer: customerId,
      collection_method: "charge_automatically",
      metadata: { bookingId, kind: "receipt" },
    },
    { idempotencyKey: `receipt:${bookingId}` },
  );
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  const paid = await stripe.invoices.pay(finalized.id, { paid_out_of_band: true });

  return { invoiceId: paid.id, invoicePdf: paid.invoice_pdf, hostedInvoiceUrl: paid.hosted_invoice_url };
}

/**
 * Optional: bill a lender for accrued platform fees over a period.
 * Only relevant if you invoice fees separately instead of skimming per rental.
 */
export async function createLenderFeeInvoice(
  ownerId: string,
  params: { amountCents: number; currency?: string; description: string; daysUntilDue?: number },
) {
  const customerId = await ensureStripeCustomer(ownerId);
  const currency = (params.currency ?? "GBP").toLowerCase();

  await stripe.invoiceItems.create({
    customer: customerId,
    amount: params.amountCents,
    currency,
    description: params.description,
  });

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: "send_invoice",
    days_until_due: params.daysUntilDue ?? 7,
    metadata: { ownerId, kind: "lender_fee" },
  });
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
  return { invoiceId: finalized.id, hostedInvoiceUrl: finalized.hosted_invoice_url };
}
