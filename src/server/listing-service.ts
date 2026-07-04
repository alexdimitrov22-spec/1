/**
 * Listing service — catalogue queries + create/edit. Pages and server actions
 * call these; nothing here trusts client input without a Zod parse.
 */
import { z } from "zod";
import { Prisma, type Listing, type ListingImage, ListingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import type { ListingCardData } from "@/components/listing-card";

const PLACEHOLDER_COVER =
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80";

export const listingInputSchema = z.object({
  title: z.string().min(4, "Give your listing a clear title").max(120),
  description: z.string().min(20, "Describe the item in a little more detail").max(4000),
  categoryId: z.string().cuid("Pick a category"),
  brand: z.string().max(60).optional(),
  model: z.string().max(60).optional(),
  condition: z.enum(["NEW", "LIKE_NEW", "EXCELLENT", "GOOD", "FAIR"]),
  priceDaily: z.coerce.number().positive("Set a daily price"),
  priceWeekly: z.coerce.number().nonnegative().optional(),
  priceMonthly: z.coerce.number().nonnegative().optional(),
  deposit: z.coerce.number().nonnegative().default(0),
  currency: z.string().length(3).default("GBP"),
  city: z.string().max(80).optional(),
  country: z.string().max(2).optional(),
  instantBook: z.coerce.boolean().default(false),
  deliveryAvailable: z.coerce.boolean().default(false),
  deliveryFee: z.coerce.number().nonnegative().optional(),
  accessories: z.array(z.string()).default([]),
  imageUrls: z.array(z.string().url()).default([]),
  publish: z.coerce.boolean().default(true),
});

export type ListingInput = z.infer<typeof listingInputSchema>;

const toCents = (n?: number | null) =>
  typeof n === "number" && !Number.isNaN(n) ? Math.round(n * 100) : null;

type ListingWithRels = Listing & {
  images: ListingImage[];
  owner: { profile: { identityVerified: boolean } | null };
};

export function toCardData(listing: ListingWithRels): ListingCardData {
  const cover = listing.images.find((i) => i.isCover) ?? listing.images[0];
  return {
    id: listing.id,
    slug: listing.slug,
    title: listing.title,
    coverUrl: cover?.url ?? PLACEHOLDER_COVER,
    city: listing.city,
    priceDailyCents: listing.priceDailyCents,
    currency: listing.currency,
    ratingAvg: 0,
    ratingCount: 0,
    instantBook: listing.instantBook,
    ownerVerified: Boolean(listing.owner.profile?.identityVerified),
  };
}

export interface SearchParams {
  q?: string;
  category?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  instantBook?: boolean;
  sort?: "recent" | "price_asc" | "price_desc";
}

export async function searchListings(params: SearchParams = {}) {
  const where: Prisma.ListingWhereInput = { status: ListingStatus.ACTIVE };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { brand: { contains: params.q, mode: "insensitive" } },
      { model: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ];
  }
  if (params.category) where.category = { slug: params.category };
  if (params.city) where.city = { contains: params.city, mode: "insensitive" };
  if (params.instantBook) where.instantBook = true;
  if (params.minPrice != null || params.maxPrice != null) {
    where.priceDailyCents = {
      ...(params.minPrice != null ? { gte: Math.round(params.minPrice * 100) } : {}),
      ...(params.maxPrice != null ? { lte: Math.round(params.maxPrice * 100) } : {}),
    };
  }

  const orderBy: Prisma.ListingOrderByWithRelationInput =
    params.sort === "price_asc"
      ? { priceDailyCents: "asc" }
      : params.sort === "price_desc"
        ? { priceDailyCents: "desc" }
        : { createdAt: "desc" };

  const listings = await prisma.listing.findMany({
    where,
    orderBy,
    take: 48,
    include: {
      images: true,
      owner: { select: { profile: { select: { identityVerified: true } } } },
    },
  });

  return listings.map(toCardData);
}

export async function getListingBySlug(slug: string) {
  return prisma.listing.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { order: "asc" } },
      category: true,
      owner: { include: { profile: true } },
    },
  });
}

/** BOOKED/BLOCKED date ranges so the booking calendar can disable them. */
export async function getUnavailableRanges(listingId: string) {
  const blocks = await prisma.availabilityBlock.findMany({
    where: { listingId, type: { in: ["BOOKED", "BLOCKED"] } },
    select: { startDate: true, endDate: true },
  });
  return blocks.map((b) => ({ start: b.startDate.toISOString(), end: b.endDate.toISOString() }));
}

export async function getOwnerListings(ownerId: string) {
  return prisma.listing.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    include: {
      images: true,
      owner: { select: { profile: { select: { identityVerified: true } } } },
      _count: { select: { bookings: true } },
    },
  });
}

async function uniqueSlug(title: string) {
  const base = slugify(title) || "listing";
  let slug = base;
  let n = 1;
  while (await prisma.listing.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function createListing(ownerId: string, input: ListingInput) {
  const data = listingInputSchema.parse(input);
  const slug = await uniqueSlug(data.title);

  return prisma.listing.create({
    data: {
      ownerId,
      slug,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      brand: data.brand || null,
      model: data.model || null,
      condition: data.condition,
      currency: data.currency,
      priceDailyCents: toCents(data.priceDaily)!,
      priceWeeklyCents: toCents(data.priceWeekly),
      priceMonthlyCents: toCents(data.priceMonthly),
      depositCents: toCents(data.deposit) ?? 0,
      city: data.city || null,
      country: data.country || null,
      instantBook: data.instantBook,
      deliveryAvailable: data.deliveryAvailable,
      deliveryFeeCents: toCents(data.deliveryFee),
      accessories: data.accessories,
      status: data.publish ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
      images: {
        create: data.imageUrls.map((url, i) => ({ url, order: i, isCover: i === 0 })),
      },
    },
  });
}

export async function updateListing(ownerId: string, listingId: string, input: ListingInput) {
  const data = listingInputSchema.parse(input);
  const existing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { ownerId: true },
  });
  if (!existing || existing.ownerId !== ownerId) throw new Error("Not found");

  return prisma.$transaction(async (tx) => {
    if (data.imageUrls.length > 0) {
      await tx.listingImage.deleteMany({ where: { listingId } });
    }
    return tx.listing.update({
      where: { id: listingId },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        brand: data.brand || null,
        model: data.model || null,
        condition: data.condition,
        currency: data.currency,
        priceDailyCents: toCents(data.priceDaily)!,
        priceWeeklyCents: toCents(data.priceWeekly),
        priceMonthlyCents: toCents(data.priceMonthly),
        depositCents: toCents(data.deposit) ?? 0,
        city: data.city || null,
        country: data.country || null,
        instantBook: data.instantBook,
        deliveryAvailable: data.deliveryAvailable,
        deliveryFeeCents: toCents(data.deliveryFee),
        accessories: data.accessories,
        status: data.publish ? ListingStatus.ACTIVE : ListingStatus.DRAFT,
        ...(data.imageUrls.length > 0
          ? {
              images: {
                create: data.imageUrls.map((url, i) => ({ url, order: i, isCover: i === 0 })),
              },
            }
          : {}),
      },
    });
  });
}

export async function getCategories() {
  return prisma.category.findMany({ orderBy: { order: "asc" } });
}
