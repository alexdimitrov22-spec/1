/**
 * Checkout — the renter hits this to reserve dates and start payment.
 * Returns the two client secrets the front-end needs:
 *   - clientSecret        : the rental charge (held in escrow)
 *   - depositClientSecret : the refundable deposit hold
 *
 * The browser confirms both with Stripe Elements; no card details ever touch
 * our server. On success, Stripe calls /api/stripe/webhook to confirm.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Auth.js helper — returns the signed-in session
import { createBooking, BookingError } from "@/server/booking-service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const result = await createBooking(session.user.id, payload);
    return NextResponse.json({
      bookingCode: result.booking.code,
      quote: result.quote,
      clientSecret: result.clientSecret,
      depositClientSecret: result.depositClientSecret,
    });
  } catch (err) {
    if (err instanceof BookingError) {
      const status = err.code === "NOT_VERIFIED" ? 403 : 409;
      return NextResponse.json({ error: err.message, code: err.code }, { status });
    }
    return NextResponse.json({ error: "Could not create booking." }, { status: 400 });
  }
}
