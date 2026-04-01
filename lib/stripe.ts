import Stripe from "stripe"
import { db } from "@/lib/db"

const API_VERSION = "2026-01-28.clover" as const

export function createStripe(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: API_VERSION })
}

export async function getStripe(): Promise<Stripe | null> {
  try {
    const settings = await db.ministrySetting.findUnique({ where: { id: "default" } })
    const key = settings?.stripeSecretKey || process.env.STRIPE_SECRET_KEY
    if (!key) return null
    return createStripe(key)
  } catch {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) return null
    return createStripe(key)
  }
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  try {
    const settings = await db.ministrySetting.findUnique({ where: { id: "default" } })
    return settings?.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null
  } catch {
    return process.env.STRIPE_WEBHOOK_SECRET || null
  }
}
