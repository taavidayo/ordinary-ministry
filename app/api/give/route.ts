import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"

export async function POST(req: Request) {
  const body = await req.json()
  const { amount, donorName, donorEmail, note, type, recurring } = body

  if (!amount || amount < 100)
    return NextResponse.json({ error: "Minimum amount is $1.00" }, { status: 400 })

  const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000"

  if (recurring) {
    // Create a subscription checkout
    const priceData = {
      currency: "usd",
      product_data: { name: `Monthly Gift — ${type || "General"}` },
      unit_amount: amount,
      recurring: { interval: "month" as const },
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price_data: priceData, quantity: 1 }],
      customer_email: donorEmail || undefined,
      success_url: `${origin}/give/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give`,
      metadata: { donorName: donorName || "", note: note || "", type: type || "general", recurring: "true" },
    })
    return NextResponse.json({ url: session.url })
  } else {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Gift — ${type || "General"}` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      customer_email: donorEmail || undefined,
      success_url: `${origin}/give/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/give`,
      metadata: { donorName: donorName || "", note: note || "", type: type || "general", recurring: "false" },
    })
    return NextResponse.json({ url: session.url })
  }
}
