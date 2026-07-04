import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { getRenterBookings } from "@/server/booking-queries";
import { formatMoney } from "@/lib/money";
import { BookingStatusBadge } from "@/components/booking-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My rentals" };

const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export default async function BookingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=/bookings");

  const bookings = await getRenterBookings(session.user.id);

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-ink">My rentals</h1>
      <p className="mt-2 text-muted-fg">Everything you've booked, past and upcoming.</p>

      {bookings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <p className="text-muted-fg">You haven't rented anything yet.</p>
          <Button asChild className="mt-4">
            <Link href="/search">Browse gear</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link
                href={`/bookings/${b.code}`}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-card"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {b.listing.images[0]?.url ? (
                    <Image src={b.listing.images[0].url} alt="" fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-muted-fg">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{b.listing.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-fg">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {fmtDate(b.startDate)} → {fmtDate(b.endDate)}
                    <span className="mx-1">·</span>
                    <span className="font-mono">{b.code}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-medium text-ink">
                    {formatMoney(b.totalCents - b.depositCents, b.currency)}
                  </p>
                  <div className="mt-1">
                    <BookingStatusBadge status={b.status} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
