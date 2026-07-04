/** Read-side queries for bookings (dashboards, confirmation pages). */
import { prisma } from "@/lib/prisma";

const listingSelect = {
  select: {
    id: true,
    slug: true,
    title: true,
    currency: true,
    images: { where: { isCover: true }, take: 1, select: { url: true } },
  },
} as const;

export async function getBookingByCode(code: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { code },
    include: {
      listing: listingSelect,
      payment: true,
      deposit: true,
      renter: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });
  if (!booking) return null;
  // Only the two parties may view a booking.
  if (booking.renterId !== userId && booking.ownerId !== userId) return null;
  return booking;
}

export async function getRenterBookings(renterId: string) {
  return prisma.booking.findMany({
    where: { renterId },
    orderBy: { createdAt: "desc" },
    include: { listing: listingSelect },
  });
}

export async function getOwnerBookings(ownerId: string) {
  return prisma.booking.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { listing: listingSelect, renter: { select: { name: true } } },
  });
}
