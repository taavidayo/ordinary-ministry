import { NextResponse } from "next/server"
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe"
import { db } from "@/lib/db"
import Stripe from "stripe"

export async function POST(req: Request) {
  const stripe = await getStripe()
  const webhookSecret = await getStripeWebhookSecret()

  if (!stripe || !webhookSecret)
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 })

  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json({ error: `Webhook Error: ${(err as Error).message}` }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const meta = session.metadata || {}
    const donorEmail = session.customer_details?.email || null

    // Try to link to a user account
    let linkedUserId: string | null = null
    if (donorEmail) {
      const matchedUser = await db.user.findUnique({ where: { email: donorEmail }, select: { id: true } })
      linkedUserId = matchedUser?.id ?? null
    }

    await db.offering.create({
      data: {
        stripePaymentId: (session.payment_intent as string) ?? session.id,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "usd",
        donorName: meta.donorName || null,
        donorEmail,
        note: meta.note || null,
        type: meta.type || null,
        categoryId: meta.categoryId || null,
        recurring: meta.recurring === "true",
        userId: linkedUserId,
      },
    })
  }

  return NextResponse.json({ received: true })
}
