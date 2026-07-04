import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, ShieldCheck, Zap } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export interface ListingCardData {
  id: string;
  slug: string;
  title: string;
  coverUrl: string;
  city: string | null;
  distanceKm?: number;
  priceDailyCents: number;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  instantBook: boolean;
  ownerVerified: boolean;
}

/** Server component — no client JS. Hover/motion is pure CSS. */
export function ListingCard({ listing, className }: { listing: ListingCardData; className?: string }) {
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className={cn(
        "group block rounded-2xl bg-surface shadow-card ring-1 ring-line/60",
        "transition-shadow duration-300 hover:shadow-pop focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-muted">
        <Image
          src={listing.coverUrl}
          alt={listing.title}
          fill
          sizes="(max-width:768px) 100vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {listing.instantBook && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink/85 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            <Zap className="h-3 w-3" /> Instant book
          </span>
        )}
      </div>

      <div className="space-y-1.5 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 font-medium text-ink">{listing.title}</h3>
          <span className="flex shrink-0 items-center gap-1 text-sm text-ink">
            <Star className="h-3.5 w-3.5 fill-ink text-ink" />
            {listing.ratingAvg.toFixed(1)}
            <span className="text-muted-fg">({listing.ratingCount})</span>
          </span>
        </div>

        <p className="flex items-center gap-1 text-sm text-muted-fg">
          <MapPin className="h-3.5 w-3.5" />
          {listing.city ?? "—"}
          {typeof listing.distanceKm === "number" && ` · ${listing.distanceKm.toFixed(0)} km away`}
        </p>

        <div className="flex items-center justify-between pt-1">
          <p className="font-mono text-ink">
            <span className="text-base font-semibold">
              {formatMoney(listing.priceDailyCents, listing.currency)}
            </span>
            <span className="text-sm text-muted-fg"> /day</span>
          </p>
          {listing.ownerVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
