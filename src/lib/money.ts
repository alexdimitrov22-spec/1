/**
 * Money helpers. All amounts are integer minor units (cents/pence).
 * Pricing logic lives here so the client, the booking service, and the
 * rental-agreement generator all quote identical numbers.
 */
import { differenceInCalendarDays } from "date-fns";

export type RateUnit = "DAY" | "WEEK" | "MONTH";

const PLATFORM_FEE_BPS = Number(process.env.PLATFORM_FEE_BPS ?? "1000"); // 10%

export function formatMoney(cents: number, currency = "GBP", locale = "en-GB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export interface ListingRates {
  priceDailyCents: number;
  priceWeeklyCents?: number | null;
  priceMonthlyCents?: number | null;
  depositCents: number;
  currency: string;
}

export interface Quote {
  unitType: RateUnit;
  unitCount: number;
  days: number;
  rentalSubtotalCents: number;
  depositCents: number;
  platformFeeCents: number;
  deliveryFeeCents: number;
  taxCents: number;
  totalCents: number; // what the renter pays now (rental + fees + deposit hold)
  currency: string;
}

/**
 * Pick the cheapest rate structure for the requested window. A 9-day rental
 * quoted at the weekly rate (1 week + 2 days) usually beats 9 daily units.
 */
export function quoteRental(
  rates: ListingRates,
  startDate: Date,
  endDate: Date,
  opts: { deliveryFeeCents?: number; taxBps?: number } = {},
): Quote {
  const days = Math.max(1, differenceInCalendarDays(endDate, startDate));
  const candidates: Array<{ unitType: RateUnit; unitCount: number; subtotal: number }> = [];

  candidates.push({ unitType: "DAY", unitCount: days, subtotal: rates.priceDailyCents * days });

  if (rates.priceWeeklyCents && days >= 7) {
    const weeks = Math.ceil(days / 7);
    candidates.push({ unitType: "WEEK", unitCount: weeks, subtotal: rates.priceWeeklyCents * weeks });
  }
  if (rates.priceMonthlyCents && days >= 28) {
    const months = Math.ceil(days / 30);
    candidates.push({ unitType: "MONTH", unitCount: months, subtotal: rates.priceMonthlyCents * months });
  }

  const best = candidates.reduce((a, b) => (b.subtotal < a.subtotal ? b : a));
  const rentalSubtotalCents = best.subtotal;
  const platformFeeCents = Math.round((rentalSubtotalCents * PLATFORM_FEE_BPS) / 10_000);
  const deliveryFeeCents = opts.deliveryFeeCents ?? 0;
  const taxableBase = rentalSubtotalCents + platformFeeCents + deliveryFeeCents;
  const taxCents = opts.taxBps ? Math.round((taxableBase * opts.taxBps) / 10_000) : 0;

  const totalCents =
    rentalSubtotalCents + platformFeeCents + deliveryFeeCents + taxCents + rates.depositCents;

  return {
    unitType: best.unitType,
    unitCount: best.unitCount,
    days,
    rentalSubtotalCents,
    depositCents: rates.depositCents,
    platformFeeCents,
    deliveryFeeCents,
    taxCents,
    totalCents,
    currency: rates.currency,
  };
}

/** What the owner receives after the platform fee (excludes the deposit hold). */
export function ownerPayoutCents(quote: Pick<Quote, "rentalSubtotalCents" | "platformFeeCents">) {
  return quote.rentalSubtotalCents - quote.platformFeeCents;
}
