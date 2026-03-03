import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { db } from "@/lib/db"
import Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata || {}

    await db.offering.create({
      data: {
        stripePaymentId: session.payment_intent as string ?? session.id,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        donorName: meta.donorName || null,
        donorEmail: session.customer_details?.email || null,
        note: meta.note || null,
        type: meta.type || null,
        recurring: meta.recurring === "true",
      },
    })
  }

  return NextResponse.json({ received: true })
}
