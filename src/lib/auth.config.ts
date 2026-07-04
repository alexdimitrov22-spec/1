import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe auth config. Contains everything that must ALSO run in the
 * middleware (route protection, OAuth providers that don't touch the DB).
 * The Credentials provider + Prisma adapter live in `auth.ts` because they
 * need Node APIs (bcrypt, Prisma) that the edge runtime can't load.
 */

// Route prefixes that require a signed-in user.
const PROTECTED_PREFIXES = ["/dashboard", "/sell", "/bookings", "/account", "/messages"];

const providers = [];
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authConfig = {
  pages: { signIn: "/sign-in" },
  providers,
  callbacks: {
    /** Gate protected routes at the edge before the page renders. */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = Boolean(auth?.user);
      const needsAuth = PROTECTED_PREFIXES.some((p) => nextUrl.pathname.startsWith(p));
      if (needsAuth && !isLoggedIn) return false; // redirects to signIn page
      return true;
    },
  },
} satisfies NextAuthConfig;
