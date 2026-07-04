"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

/**
 * Confirms the rental charge (held in escrow) and, if present, authorises the
 * refundable deposit hold using the same card. Rendered inside <Elements>
 * bound to the rental PaymentIntent's client secret.
 */
export function CheckoutForm({
  bookingCode,
  depositClientSecret,
  depositCents,
  currency,
  totalCents,
}: {
  bookingCode: string;
  depositClientSecret: string | null;
  depositCents: number;
  currency: string;
  totalCents: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);

    // 1) Confirm the rental charge (funds held in escrow on the platform).
    const { error: rentalErr, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (rentalErr) {
      setError(rentalErr.message ?? "Payment could not be completed.");
      setBusy(false);
      return;
    }

    // 2) Authorise the deposit hold with the same payment method (no capture).
    if (depositClientSecret && paymentIntent?.payment_method) {
      const { error: depErr } = await stripe.confirmCardPayment(depositClientSecret, {
        payment_method: paymentIntent.payment_method as string,
      });
      if (depErr) {
        // Rental succeeded but the hold failed — send them to the booking page,
        // which will show the deposit as pending for the lender to resolve.
        setError(
          "Payment succeeded, but the deposit hold needs another try. We'll follow up on your booking.",
        );
      }
    }

    router.push(`/bookings/${bookingCode}?success=1`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />

      {depositCents > 0 && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-fg">
          A refundable {formatMoney(depositCents, currency)} deposit is held (not charged)
          and released on a clean return.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={!stripe || busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Pay {formatMoney(totalCents, currency)}
      </Button>

      <p className="text-center text-xs text-muted-fg">
        Payments are processed securely by Stripe. Card details never touch our servers.
      </p>
    </form>
  );
}
