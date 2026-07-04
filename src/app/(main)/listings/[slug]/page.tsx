import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, ShieldCheck, Star, Package, Truck, Zap, Pencil } from "lucide-react";
import { auth } from "@/lib/auth";
import { getListingBySlug, getUnavailableRanges } from "@/server/listing-service";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookingWidget } from "@/components/booking-widget";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug).catch(() => null);
  return { title: listing?.title ?? "Listing" };
}

const conditionLabel = (c: string) =>
  c.replace("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

export default async function ListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, session] = await Promise.all([getListingBySlug(slug), auth()]);
  if (!listing) notFound();

  const unavailable = await getUnavailableRanges(listing.id);
  const isOwner = session?.user?.id === listing.ownerId;
  const cover = listing.images.find((i) => i.isCover) ?? listing.images[0];
  const gallery = listing.images.length ? listing.images : cover ? [cover] : [];
  const specs = (listing.specs as Record<string, string> | null) ?? null;

  return (
    <div className="container py-8">
      <nav className="mb-4 text-sm text-muted-fg">
        <Link href="/search" className="hover:text-ink">
          Browse
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/search?category=${listing.category.slug}`} className="hover:text-ink">
          {listing.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          {/* Gallery */}
          <div className="overflow-hidden rounded-2xl border border-line bg-muted">
            <div className="relative aspect-[4/3]">
              {gallery[0] ? (
                <Image
                  src={gallery[0].url}
                  alt={listing.title}
                  fill
                  priority
                  sizes="(max-width:1024px) 100vw, 60vw"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-muted-fg">
                  <Package className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {gallery.slice(0, 5).map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-line bg-muted">
                  <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Header */}
          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              {listing.instantBook && (
                <Badge variant="ink">
                  <Zap className="h-3 w-3" /> Instant book
                </Badge>
              )}
              <Badge variant="neutral">{conditionLabel(listing.condition)}</Badge>
              {listing.deliveryAvailable && (
                <Badge variant="neutral">
                  <Truck className="h-3 w-3" /> Delivery
                </Badge>
              )}
            </div>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">{listing.title}</h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-fg">
              <MapPin className="h-4 w-4" />
              {listing.city ?? "Location on request"}
              {(listing.brand || listing.model) && (
                <span className="ml-2">
                  · {[listing.brand, listing.model].filter(Boolean).join(" ")}
                </span>
              )}
            </p>
          </div>

          {/* Description */}
          <div className="mt-6 border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-ink">About this item</h2>
            <p className="mt-3 whitespace-pre-line text-muted-fg">{listing.description}</p>
          </div>

          {/* Accessories */}
          {listing.accessories.length > 0 && (
            <div className="mt-6 border-t border-line pt-6">
              <h2 className="text-lg font-semibold text-ink">What's included</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {listing.accessories.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm text-ink">
                    <Package className="h-4 w-4 text-accent" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Specs */}
          {specs && Object.keys(specs).length > 0 && (
            <div className="mt-6 border-t border-line pt-6">
              <h2 className="text-lg font-semibold text-ink">Specifications</h2>
              <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-line/60 py-1.5 text-sm">
                    <dt className="text-muted-fg">{k}</dt>
                    <dd className="font-mono tabular text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Owner */}
          <div className="mt-6 border-t border-line pt-6">
            <h2 className="text-lg font-semibold text-ink">Your lender</h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                {(listing.owner.profile?.displayName ?? listing.owner.name ?? "?")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div>
                <p className="flex items-center gap-2 font-medium text-ink">
                  {listing.owner.profile?.displayName ?? listing.owner.name ?? "Lender"}
                  {listing.owner.profile?.identityVerified && (
                    <ShieldCheck className="h-4 w-4 text-accent" />
                  )}
                </p>
                {listing.owner.profile && listing.owner.profile.ratingCount > 0 && (
                  <p className="flex items-center gap-1 text-sm text-muted-fg">
                    <Star className="h-3.5 w-3.5 fill-ink text-ink" />
                    {listing.owner.profile.ratingAvg.toFixed(1)} ·{" "}
                    {listing.owner.profile.completedRentals} rentals
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Booking column */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {isOwner ? (
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <p className="text-sm text-muted-fg">This is your listing.</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-ink">
                {formatMoney(listing.priceDailyCents, listing.currency)}
                <span className="text-sm font-normal text-muted-fg"> /day</span>
              </p>
              <Button asChild className="mt-4 w-full">
                <Link href={`/sell/${listing.id}/edit`}>
                  <Pencil className="h-4 w-4" /> Edit listing
                </Link>
              </Button>
            </div>
          ) : (
            <BookingWidget
              listing={{
                id: listing.id,
                slug: listing.slug,
                priceDailyCents: listing.priceDailyCents,
                priceWeeklyCents: listing.priceWeeklyCents,
                priceMonthlyCents: listing.priceMonthlyCents,
                depositCents: listing.depositCents,
                deliveryFeeCents: listing.deliveryFeeCents,
                deliveryAvailable: listing.deliveryAvailable,
                currency: listing.currency,
                instantBook: listing.instantBook,
              }}
              unavailable={unavailable}
              isAuthed={Boolean(session?.user)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
