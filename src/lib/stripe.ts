// Stripe singleton — uses STRIPE_SECRET_KEY from env.
// In Emergent's preview we have STRIPE_API_KEY=sk_test_emergent (placeholder).
// For production replace with a real test/live key from your Stripe dashboard.
import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY;
  if (!key) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  _stripe = new Stripe(key, { apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion });
  return _stripe;
}

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_API_KEY;
  return Boolean(key) && key !== "sk_test_emergent"; // placeholder doesn't actually work
}
