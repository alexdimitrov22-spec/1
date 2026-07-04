"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { CalendarDays, ShieldCheck, Zap, AlertCircle, Loader2 } from "lucide-react";
import { getStripe } from "@/lib/stripe-client";
import { quoteRental, formatMoney, ownerPayoutCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckoutForm } from "@/components/checkout-form";

interface WidgetListing {
  id: string;
  slug: string;
  priceDailyCents: number;
  priceWeeklyCents: number | null;
  priceMonthlyCents: number | null;
  depositCents: number;
  deliveryFeeCents: number | null;
  deliveryAvailable: boolean;
  currency: string;
  instantBook: boolean;
}

type UnavailableRange = { start: string; end: string };

type CheckoutSession = {
  bookingCode: string;
  clientSecret: string;
  depositClientSecret: string | null;
  rentalChargeCents: number;
  depositCents: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function BookingWidget({
  listing,
  unavailable,
  isAuthed,
}: {
  listing: WidgetListing;
  unavailable: UnavailableRange[];
  isAuthed: boolean;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [delivery, setDelivery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutSession | null>(null);

  const quote = useMemo(() => {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    if (e <= s) return null;
    return quoteRental(
      {
        priceDailyCents: listing.priceDailyCents,
        priceWeeklyCents: listing.priceWeeklyCents,
        priceMonthlyCents: listing.priceMonthlyCents,
        depositCents: listing.depositCents,
        currency: listing.currency,
      },
      s,
      e,
      { deliveryFeeCents: delivery ? listing.deliveryFeeCents ?? 0 : 0 },
    );
  }, [start, end, delivery, listing]);

  function overlapsUnavailable(s: string, e: string) {
    const a = new Date(s).getTime();
    const b = new Date(e).getTime();
    return unavailable.some((r) => {
      const rs = new Date(r.start).getTime();
      const re = new Date(r.end).getTime();
      return a < re && b > rs;
    });
  }

  async function startCheckout() {
    setError(null);
    if (!start || !end) return setError("Choose your rental dates.");
    if (new Date(end) <= new Date(start)) return setError("End date must be after the start date.");
    if (overlapsUnavailable(start, end)) return setError("Some of those dates are already booked.");

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: listing.id,
          startDate: start,
          endDate: end,
          deliveryMethod: delivery ? "DELIVERY" : "PICKUP",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NOT_VERIFIED") {
          setError("Verify your identity before booking. Head to your account to start.");
        } else {
          setError(data.error ?? "Could not start checkout.");
        }
        return;
      }
      const rentalChargeCents = data.quote.totalCents - data.quote.depositCents;
      setCheckout({
        bookingCode: data.bookingCode,
        clientSecret: data.clientSecret,
        depositClientSecret: data.depositClientSecret,
        rentalChargeCents,
        depositCents: data.quote.depositCents,
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // ---- Payment step -------------------------------------------------------
  if (checkout) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-ink">Confirm & pay</h2>
        <p className="mt-1 text-sm text-muted-fg">
          Booking <span className="font-mono text-ink">{checkout.bookingCode}</span>
        </p>
        <div className="mt-5">
          <Elements
            stripe={getStripe()}
            options={{
              clientSecret: checkout.clientSecret,
              appearance: {
                theme: "flat",
                variables: { colorPrimary: "#0B7A54", borderRadius: "12px" },
              },
            }}
          >
            <CheckoutForm
              bookingCode={checkout.bookingCode}
              depositClientSecret={checkout.depositClientSecret}
              depositCents={checkout.depositCents}
              currency={listing.currency}
              totalCents={checkout.rentalChargeCents}
            />
          </Elements>
        </div>
      </div>
    );
  }

  // ---- Date selection step ------------------------------------------------
  return (
    <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-2xl font-semibold text-ink">
          {formatMoney(listing.priceDailyCents, listing.currency)}
          <span className="text-sm font-normal text-muted-fg"> /day</span>
        </p>
        {listing.instantBook ? (
          <Badge variant="ink">
            <Zap className="h-3 w-3" /> Instant book
          </Badge>
        ) : (
          <Badge variant="neutral">Request to book</Badge>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-fg">From</span>
          <input
            type="date"
            min={todayISO()}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-fg">To</span>
          <input
            type="date"
            min={start || todayISO()}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </label>
      </div>

      {listing.deliveryAvailable && (
        <label className="mt-3 flex items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={delivery}
            onChange={(e) => setDelivery(e.target.checked)}
            className="h-4 w-4 rounded border-line accent-accent"
          />
          Delivery
          {listing.deliveryFeeCents ? (
            <span className="text-muted-fg">
              (+{formatMoney(listing.deliveryFeeCents, listing.currency)})
            </span>
          ) : null}
        </label>
      )}

      {quote && (
        <dl className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
          <Row
            label={`${formatMoney(
              quote.rentalSubtotalCents / quote.unitCount,
              listing.currency,
            )} × ${quote.unitCount} ${quote.unitType.toLowerCase()}${quote.unitCount > 1 ? "s" : ""}`}
            value={formatMoney(quote.rentalSubtotalCents, listing.currency)}
          />
          <Row label="Service fee" value={formatMoney(quote.platformFeeCents, listing.currency)} />
          {quote.deliveryFeeCents > 0 && (
            <Row label="Delivery" value={formatMoney(quote.deliveryFeeCents, listing.currency)} />
          )}
          <Row
            label="Deposit (refundable hold)"
            value={formatMoney(quote.depositCents, listing.currency)}
            muted
          />
          <div className="flex items-center justify-between border-t border-line pt-2 font-medium text-ink">
            <span>Due now</span>
            <span className="font-mono tabular">
              {formatMoney(quote.totalCents - quote.depositCents, listing.currency)}
            </span>
          </div>
        </dl>
      )}

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <div className="mt-5">
        {isAuthed ? (
          <Button onClick={startCheckout} disabled={busy || !quote} className="w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {listing.instantBook ? "Reserve & pay" : "Request & pay"}
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link href={`/sign-in?callbackUrl=/listings/${listing.slug}`}>Sign in to book</Link>
          </Button>
        )}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-fg">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        {quote
          ? `${formatMoney(ownerPayoutCents(quote), listing.currency)} goes to the lender · protected by escrow`
          : "Payments protected by escrow — released on a clean return"}
      </p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-fg" : "text-ink"}>{label}</span>
      <span className="font-mono tabular text-ink">{value}</span>
    </div>
  );
}
