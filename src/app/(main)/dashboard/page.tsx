import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  PlusCircle,
  Pencil,
  Package,
  CalendarDays,
  Wallet,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnerListings } from "@/server/listing-service";
import { getOwnerBookings } from "@/server/booking-queries";
import { formatMoney } from "@/lib/money";
import { startPayoutOnboarding } from "@/server/payout-actions";
import { BookingStatusBadge } from "@/components/booking-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Dashboard" };

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/dashboard");

  const [user, listings, bookings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeConnectOnboarded: true },
    }),
    getOwnerListings(session.user.id),
    getOwnerBookings(session.user.id),
  ]);

  const activeCount = listings.filter((l) => l.status === "ACTIVE").length;

  return (
    <div className="container max-w-4xl py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">Lender dashboard</h1>
          <p className="mt-2 text-muted-fg">
            {activeCount} active {activeCount === 1 ? "listing" : "listings"} ·{" "}
            {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
          </p>
        </div>
        <Button asChild>
          <Link href="/sell/new">
            <PlusCircle className="h-4 w-4" /> List an item
          </Link>
        </Button>
      </div>

      {/* Payout setup (Stripe Connect) */}
      {!user?.stripeConnectOnboarded && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft p-5">
          <div className="flex items-start gap-3">
            <Wallet className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-ink">Set up payouts to get paid</p>
              <p className="text-sm text-muted-fg">
                Connect your bank via Stripe so rental earnings reach you after each return.
              </p>
            </div>
          </div>
          <form action={startPayoutOnboarding}>
            <Button type="submit" size="sm">
              Set up payouts <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
      {user?.stripeConnectOnboarded && (
        <div className="mt-6 flex items-center gap-2 rounded-2xl border border-line bg-surface px-5 py-3 text-sm text-ink">
          <CheckCircle2 className="h-4 w-4 text-accent" /> Payouts are set up — you're ready to earn.
        </div>
      )}

      {/* Incoming bookings */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Incoming bookings</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted-fg">
            No bookings yet. They'll appear here as renters reserve your gear.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/bookings/${b.code}`}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{b.listing.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-fg">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                      <span className="mx-1">·</span> {b.renter.name ?? "Renter"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-medium text-ink">
                      {formatMoney(b.rentalSubtotalCents - b.platformFeeCents, b.currency)}
                    </p>
                    <p className="text-xs text-muted-fg">your payout</p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Listings */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-ink">Your listings</h2>
        {listings.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="text-muted-fg">You haven't listed anything yet.</p>
            <Button asChild className="mt-4">
              <Link href="/sell/new">Create your first listing</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {listings.map((l) => (
              <li key={l.id} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {l.images[0]?.url ? (
                    <Image src={l.images[0].url} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-fg">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{l.title}</p>
                  <p className="font-mono text-sm text-muted-fg">
                    {formatMoney(l.priceDailyCents, l.currency)}/day
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant={l.status === "ACTIVE" ? "default" : "neutral"}>
                      {l.status.toLowerCase()}
                    </Badge>
                    <span className="text-xs text-muted-fg">{l._count.bookings} bookings</span>
                  </div>
                </div>
                <Link
                  href={`/sell/${l.id}/edit`}
                  className="self-start rounded-lg p-2 text-muted-fg hover:bg-muted hover:text-ink"
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
