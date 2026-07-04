import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, CalendarDays, Package, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getBookingByCode } from "@/server/booking-queries";
import { formatMoney } from "@/lib/money";
import { BookingStatusBadge } from "@/components/booking-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your booking" };

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { code } = await params;
  const { success } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect(`/sign-in?callbackUrl=/bookings/${code}`);

  const booking = await getBookingByCode(code, session.user.id);
  if (!booking) notFound();

  const isRenter = booking.renterId === session.user.id;
  const cover = booking.listing.images[0]?.url;
  const rentalChargeCents = booking.totalCents - booking.depositCents;

  return (
    <div className="container max-w-2xl py-10">
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4">
          <CheckCircle2 className="h-6 w-6 text-accent" />
          <div>
            <p className="font-medium text-ink">Payment received — your booking is being confirmed.</p>
            <p className="text-sm text-muted-fg">
              We'll email you once the lender is notified. This can take a few seconds.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-fg">Booking reference</p>
          <h1 className="font-mono text-2xl font-semibold text-ink">{booking.code}</h1>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      <div className="mt-6 flex gap-4 rounded-2xl border border-line bg-surface p-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {cover ? (
            <Image src={cover} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-muted-fg">
              <Package className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/listings/${booking.listing.slug}`} className="font-medium text-ink hover:underline">
            {booking.listing.title}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-fg">
            <CalendarDays className="h-4 w-4" />
            {fmtDate(booking.startDate)} → {fmtDate(booking.endDate)}
          </p>
          <p className="mt-0.5 text-sm text-muted-fg">
            {isRenter ? `Lender: ${booking.owner.name ?? "—"}` : `Renter: ${booking.renter.name ?? "—"}`}
          </p>
        </div>
      </div>

      {/* Money breakdown */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="text-sm font-medium text-ink">Payment summary</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Rental" value={formatMoney(booking.rentalSubtotalCents, booking.currency)} />
          <Row label="Service fee" value={formatMoney(booking.platformFeeCents, booking.currency)} />
          {booking.deliveryFeeCents > 0 && (
            <Row label="Delivery" value={formatMoney(booking.deliveryFeeCents, booking.currency)} />
          )}
          <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
            <span>{isRenter ? "You paid" : "Renter paid"}</span>
            <span className="font-mono tabular">{formatMoney(rentalChargeCents, booking.currency)}</span>
          </div>
          {booking.depositCents > 0 && (
            <Row
              label="Refundable deposit (held)"
              value={formatMoney(booking.depositCents, booking.currency)}
              muted
            />
          )}
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={isRenter ? "/bookings" : "/dashboard"}>
            {isRenter ? "All my rentals" : "Owner dashboard"} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href={`/listings/${booking.listing.slug}`}>View listing</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? "text-muted-fg" : "text-ink"}>{label}</dt>
      <dd className="font-mono tabular text-ink">{value}</dd>
    </div>
  );
}
