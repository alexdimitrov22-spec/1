"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, PackageCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  confirmHandover,
  confirmCleanReturn,
  reportDamageReturn,
  type BookingActionState,
} from "@/server/booking-actions";
import { formatMoney } from "@/lib/money";

/**
 * Owner-only controls that drive a booking through the return flow:
 * CONFIRMED → (handover) → ACTIVE → (clean return | damage) → COMPLETED.
 */
export function ReturnActions({
  bookingId,
  status,
  depositCents,
  currency,
}: {
  bookingId: string;
  status: string;
  depositCents: number;
  currency: string;
}) {
  if (["COMPLETED", "CANCELLED", "DISPUTED"].includes(status)) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-sm font-medium text-ink">Manage this rental</h2>

      {status === "CONFIRMED" && (
        <SingleAction
          action={confirmHandover}
          bookingId={bookingId}
          label="Mark as handed over"
          icon={<PackageCheck className="h-4 w-4" />}
          hint="Confirm you've given the item to the renter."
        />
      )}

      {["ACTIVE", "AWAITING_RETURN"].includes(status) && (
        <div className="mt-4 space-y-4">
          <SingleAction
            action={confirmCleanReturn}
            bookingId={bookingId}
            label="Confirm clean return"
            icon={<CheckCircle2 className="h-4 w-4" />}
            hint="Releases the deposit hold and sends your payout."
          />
          <DamageForm
            bookingId={bookingId}
            depositCents={depositCents}
            currency={currency}
          />
        </div>
      )}
    </div>
  );
}

function Feedback({ state }: { state: BookingActionState }) {
  if (!state) return null;
  if (state.ok)
    return (
      <p className="mt-2 flex items-start gap-2 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {state.ok}
      </p>
    );
  return (
    <p className="mt-2 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {state.error}
    </p>
  );
}

function SingleAction({
  action,
  bookingId,
  label,
  icon,
  hint,
}: {
  action: (prev: BookingActionState, fd: FormData) => Promise<BookingActionState>;
  bookingId: string;
  label: string;
  icon: React.ReactNode;
  hint: string;
}) {
  const [state, formAction, pending] = useActionState<BookingActionState, FormData>(action, undefined);
  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        {label}
      </Button>
      <p className="mt-1.5 text-xs text-muted-fg">{hint}</p>
      <Feedback state={state} />
    </form>
  );
}

function DamageForm({
  bookingId,
  depositCents,
  currency,
}: {
  bookingId: string;
  depositCents: number;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<BookingActionState, FormData>(
    reportDamageReturn,
    undefined,
  );

  if (depositCents <= 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-warn underline-offset-2 hover:underline"
      >
        <ShieldAlert className="h-4 w-4" /> Report damage instead
      </button>
    );
  }

  return (
    <form action={formAction} className="rounded-xl border border-warn/30 bg-warn/5 p-4">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm font-medium text-ink">Charge from the deposit</p>
      <p className="mt-1 text-xs text-muted-fg">
        Up to {formatMoney(depositCents, currency)} held. The rest is released to the renter.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          name="amount"
          type="number"
          min={0}
          step="0.01"
          max={depositCents / 100}
          placeholder="0.00"
          className="font-mono tabular"
          required
        />
        <Button type="submit" variant="danger" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Charge & close
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}
