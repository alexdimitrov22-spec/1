"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { completeBooking, completeBookingWithDamage } from "@/server/booking-lifecycle";

export type BookingActionState = { error?: string; ok?: string } | undefined;

async function loadOwnedBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      code: true,
      status: true,
      ownerId: true,
      depositCents: true,
      owner: { select: { stripeConnectOnboarded: true } },
    },
  });
  if (!booking || booking.ownerId !== userId) return null;
  return booking;
}

/** Owner confirms the item was handed to the renter: CONFIRMED → ACTIVE. */
export async function confirmHandover(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in." };
  const bookingId = String(formData.get("bookingId") ?? "");

  const booking = await loadOwnedBooking(bookingId, session.user.id);
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "CONFIRMED") return { error: "This booking can't be handed over now." };

  await prisma.booking.update({ where: { id: booking.id }, data: { status: "ACTIVE" } });
  revalidatePath(`/bookings/${booking.code}`);
  revalidatePath("/dashboard");
  return { ok: "Marked as handed over. Enjoy the rental!" };
}

/** Owner confirms a clean return: release the deposit hold + pay out + complete. */
export async function confirmCleanReturn(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in." };
  const bookingId = String(formData.get("bookingId") ?? "");

  const booking = await loadOwnedBooking(bookingId, session.user.id);
  if (!booking) return { error: "Booking not found." };
  if (!["ACTIVE", "AWAITING_RETURN", "CONFIRMED"].includes(booking.status)) {
    return { error: "This booking isn't awaiting a return." };
  }
  if (!booking.owner.stripeConnectOnboarded) {
    return { error: "Set up payouts before completing a rental (Dashboard → Set up payouts)." };
  }

  try {
    await completeBooking(booking.id);
  } catch {
    return { error: "Couldn't complete the return. Please try again shortly." };
  }
  revalidatePath(`/bookings/${booking.code}`);
  revalidatePath("/dashboard");
  return { ok: "Return confirmed — deposit released and your payout is on the way." };
}

/** Owner reports damage: capture part/all of the deposit, then pay out + complete. */
export async function reportDamageReturn(
  _prev: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Please sign in." };
  const bookingId = String(formData.get("bookingId") ?? "");
  const amount = Number(formData.get("amount"));

  const booking = await loadOwnedBooking(bookingId, session.user.id);
  if (!booking) return { error: "Booking not found." };
  if (!["ACTIVE", "AWAITING_RETURN", "CONFIRMED"].includes(booking.status)) {
    return { error: "This booking isn't awaiting a return." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter the damage amount to charge from the deposit." };
  }
  const cents = Math.round(amount * 100);
  if (cents > booking.depositCents) {
    return { error: "That's more than the held deposit. Open a dispute for larger claims." };
  }
  if (!booking.owner.stripeConnectOnboarded) {
    return { error: "Set up payouts before completing a rental (Dashboard → Set up payouts)." };
  }

  try {
    await completeBookingWithDamage(booking.id, cents);
  } catch {
    return { error: "Couldn't process the charge. Please try again shortly." };
  }
  revalidatePath(`/bookings/${booking.code}`);
  revalidatePath("/dashboard");
  return { ok: "Deposit charged for the reported damage and the rental is closed." };
}
