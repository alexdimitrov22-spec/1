import Stripe from "stripe";

/**
 * Server-side Stripe client, created lazily on first use.
 *
 * Instantiating `new Stripe()` at module load throws when no key is present,
 * which breaks `next build`'s page-data collection (env isn't available then).
 * The Proxy defers construction until a property is actually accessed at
 * runtime, by which point STRIPE_SECRET_KEY is set.
 */
let instance: Stripe | null = null;

function client(): Stripe {
  if (!instance) {
    instance = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return instance;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const value = Reflect.get(client(), prop, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
