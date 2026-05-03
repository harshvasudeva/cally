// POST /api/stripe/webhook
// Verifies signature with STRIPE_WEBHOOK_SECRET and processes events.
// Idempotent — duplicate event ids are skipped.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not set" }, { status: 503 });

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const buf = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(buf, sig, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` },
      { status: 400 },
    );
  }

  // Idempotency — store event id in audit log (use AuditLog as a generic event store)
  const seen = await prisma.auditLog.findFirst({
    where: { action: "STRIPE_WEBHOOK", entityId: event.id },
  });
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  await prisma.auditLog.create({
    data: {
      action: "STRIPE_WEBHOOK",
      entity: "stripe.event",
      entityId: event.id,
      details: { type: event.type } as Record<string, unknown>,
    },
  });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const appointmentId = session.metadata?.appointmentId;
      if (!appointmentId) break;
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentStatus: "paid",
          status: "CONFIRMED",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        },
      });
      break;
    }
    case "payment_intent.payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent;
      const appointmentId = (session.metadata as Record<string, string> | undefined)?.appointmentId;
      if (!appointmentId) break;
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { paymentStatus: "failed" },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
