// POST /api/stripe/checkout
// Body: { appointmentTypeId, hostSlug, start (ISO), end (ISO), guestEmail, guestName, guestNotes? }
// 1. Validate the AppointmentType requires payment.
// 2. Create a PENDING Appointment row.
// 3. Create a Stripe Checkout Session with backend-defined amount/currency.
// 4. Return { url, sessionId } for the client to redirect.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in /app/.env." },
      { status: 503 },
    );
  }

  const body = (await req.json()) as {
    appointmentTypeId?: string;
    hostSlug?: string;
    start?: string;
    end?: string;
    guestEmail?: string;
    guestName?: string;
    guestNotes?: string;
    originUrl?: string;
  };

  const required = ["appointmentTypeId", "hostSlug", "start", "end", "guestEmail", "guestName", "originUrl"] as const;
  for (const k of required) {
    if (!body[k]) return NextResponse.json({ error: `${k} is required` }, { status: 400 });
  }

  const apptType = await prisma.appointmentType.findFirst({
    where: { id: body.appointmentTypeId, user: { slug: body.hostSlug } },
    include: { user: true },
  });
  if (!apptType) return NextResponse.json({ error: "Appointment type not found" }, { status: 404 });
  if (!apptType.requiresPayment || apptType.priceCents <= 0) {
    return NextResponse.json({ error: "This appointment type is not paid" }, { status: 400 });
  }

  // 1. Create pending appointment (price comes from server-side row, never trust client).
  const appt = await prisma.appointment.create({
    data: {
      title: apptType.name,
      start: new Date(body.start!),
      end: new Date(body.end!),
      status: "PENDING",
      paymentStatus: "pending",
      guestEmail: body.guestEmail!,
      guestName: body.guestName!,
      guestNotes: body.guestNotes ?? null,
      userId: apptType.userId,
      appointmentTypeId: apptType.id,
    },
  });

  // 2. Create Stripe checkout session
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: apptType.currency.toLowerCase(),
          product_data: {
            name: apptType.name,
            description: `${apptType.duration}-minute meeting with ${apptType.user.name ?? apptType.user.slug}`,
          },
          unit_amount: apptType.priceCents,
        },
        quantity: 1,
      },
    ],
    customer_email: body.guestEmail!,
    metadata: {
      appointmentId: appt.id,
      hostUserId: apptType.userId,
    },
    success_url: `${body.originUrl}/book/${body.hostSlug}/${apptType.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${body.originUrl}/book/${body.hostSlug}/${apptType.slug}?cancelled=1`,
  });

  await prisma.appointment.update({
    where: { id: appt.id },
    data: { stripePaymentIntentId: session.id },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id, appointmentId: appt.id });
}
