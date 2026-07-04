/**
 * Booking service — the core money + availability flow.
 *
 * Escrow model:
 *   - Rental amount + platform fee are charged to the renter and HELD (funds
 *     stay on the platform until the rental completes, then transferred to the
 *     owner minus the fee via Stripe Connect).
 *   - The deposit is a SEPARATE manual-capture PaymentIntent — an authorisation
 *     hold that is either released (voided) on a clean return or partially
 *     captured to cover damage after a dispute.
 *
 * Double-booking safety: availability is checked and the BOOKED block is written
 * inside one transaction, and AvailabilityBlock has a partial index on the date
 * range. Under load, wrap the check+insert in a SERIALIZABLE transaction (shown
 * below) so two overlapping requests can't both succeed.
 */
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { quoteRental } from "@/lib/money";
import { generateBookingCode } from "@/lib/utils";
import { stripe } from "@/lib/stripe";
import { Prisma } from "@prisma/client";

export const createBookingSchema = z
  .object({
    listingId: z.string().cuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  })
  .refine((v) => v.endDate > v.startDate, {
    message: "End date must be after the start date",
    path: ["endDate"],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export class BookingError extends Error {
  constructor(
    public code:
      | "NOT_VERIFIED"
      | "LISTING_UNAVAILABLE"
      | "DATE_CONFLICT"
      | "OWN_LISTING"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

async function hasDateConflict(
  tx: Prisma.TransactionClient,
  listingId: string,
  startDate: Date,
  endDate: Date,
) {
  const overlap = await tx.availabilityBlock.findFirst({
    where: {
      listingId,
      type: { in: ["BOOKED", "BLOCKED"] },
      startDate: { lt: endDate },
      endDate: { gt: startDate },
    },
    select: { id: true },
  });
  return Boolean(overlap);
}

export async function createBooking(renterId: string, raw: CreateBookingInput) {
  const input = createBookingSchema.parse(raw);

  // The renter must have a verified identity before transacting.
  const renter = await prisma.user.findUnique({
    where: { id: renterId },
    include: { profile: true },
  });
  if (!renter?.profile?.identityVerified) {
    throw new BookingError("NOT_VERIFIED", "Verify your identity before booking.");
  }

  const listing = await prisma.listing.findUnique({
    where: { id: input.listingId },
    include: { owner: true },
  });
  if (!listing || listing.status !== "ACTIVE") {
    throw new BookingError("NOT_FOUND", "This listing is no longer available.");
  }
  if (listing.ownerId === renterId) {
    throw new BookingError("OWN_LISTING", "You can't rent your own item.");
  }

  const deliveryFeeCents =
    input.deliveryMethod === "DELIVERY" ? listing.deliveryFeeCents ?? 0 : 0;

  const quote = quoteRental(
    {
      priceDailyCents: listing.priceDailyCents,
      priceWeeklyCents: listing.priceWeeklyCents,
      priceMonthlyCents: listing.priceMonthlyCents,
      depositCents: listing.depositCents,
      currency: listing.currency,
    },
    input.startDate,
    input.endDate,
    { deliveryFeeCents },
  );

  // Reserve atomically. Serializable prevents two overlapping bookings racing.
  const booking = await prisma.$transaction(
    async (tx) => {
      if (await hasDateConflict(tx, listing.id, input.startDate, input.endDate)) {
        throw new BookingError("DATE_CONFLICT", "Those dates are already booked.");
      }

      const created = await tx.booking.create({
        data: {
          code: generateBookingCode(),
          listingId: listing.id,
          renterId,
          ownerId: listing.ownerId,
          startDate: input.startDate,
          endDate: input.endDate,
          unitType: quote.unitType,
          unitCount: quote.unitCount,
          rentalSubtotalCents: quote.rentalSubtotalCents,
          depositCents: quote.depositCents,
          platformFeeCents: quote.platformFeeCents,
          deliveryFeeCents: quote.deliveryFeeCents,
          taxCents: quote.taxCents,
          totalCents: quote.totalCents,
          currency: quote.currency,
          deliveryMethod: input.deliveryMethod,
          status: "PENDING",
          availabilityHold: {
            create: {
              listingId: listing.id,
              startDate: input.startDate,
              endDate: input.endDate,
              type: "BOOKED",
            },
          },
        },
      });
      return created;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // Rental charge held in escrow (captured now, transferred on completion).
  const rentalIntent = await stripe.paymentIntents.create({
    amount: quote.rentalSubtotalCents + quote.platformFeeCents + quote.deliveryFeeCents + quote.taxCents,
    currency: quote.currency.toLowerCase(),
    customer: renter.stripeCustomerId ?? undefined,
    capture_method: "automatic",
    transfer_group: booking.code,
    metadata: { bookingId: booking.id, kind: "rental" },
  });

  // Deposit as an authorisation hold (manual capture) — money isn't taken
  // unless damage is charged after return.
  const depositIntent =
    quote.depositCents > 0
      ? await stripe.paymentIntents.create({
          amount: quote.depositCents,
          currency: quote.currency.toLowerCase(),
          customer: renter.stripeCustomerId ?? undefined,
          capture_method: "manual",
          metadata: { bookingId: booking.id, kind: "deposit" },
        })
      : null;

  await prisma.$transaction([
    prisma.payment.create({
      data: {
        bookingId: booking.id,
        stripePaymentIntentId: rentalIntent.id,
        amountCents: rentalIntent.amount,
        currency: quote.currency,
        status: "REQUIRES_PAYMENT",
      },
    }),
    ...(depositIntent
      ? [
          prisma.deposit.create({
            data: {
              bookingId: booking.id,
              stripePaymentIntentId: depositIntent.id,
              amountCents: quote.depositCents,
              currency: quote.currency,
              status: "PENDING",
            },
          }),
        ]
      : []),
    prisma.ledgerEntry.create({
      data: {
        bookingId: booking.id,
        userId: renterId,
        type: "PLATFORM_FEE",
        direction: "CREDIT",
        amountCents: quote.platformFeeCents,
        currency: quote.currency,
        meta: { note: "Fee accrued at booking" },
      },
    }),
  ]);

  return {
    booking,
    quote,
    clientSecret: rentalIntent.client_secret,
    depositClientSecret: depositIntent?.client_secret ?? null,
  };
}
