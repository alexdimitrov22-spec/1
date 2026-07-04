import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Edge middleware runs the lightweight config (no Prisma/bcrypt) purely to
// gate protected routes via the `authorized` callback.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware((req) => {
  // The `authorized` callback returns false for protected routes when logged
  // out; NextAuth turns that into a redirect to the sign-in page automatically.
  return;
});

export const config = {
  // Skip static assets, image optimisation, and API/webhook routes.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
