"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

const PRESET_AMOUNTS = [25, 50, 100, 250]
const FUND_TYPES = ["General", "Tithe", "Offering", "Missions", "Building Fund"]

export default function GiveForm() {
  const [amount, setAmount] = useState("")
  const [custom, setCustom] = useState("")
  const [donorName, setDonorName] = useState("")
  const [donorEmail, setDonorEmail] = useState("")
  const [note, setNote] = useState("")
  const [type, setType] = useState("General")
  const [recurring, setRecurring] = useState(false)
  const [loading, setLoading] = useState(false)

  const finalAmount = custom ? parseFloat(custom) : parseFloat(amount)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!finalAmount || finalAmount < 1) { toast.error("Please enter an amount of at least $1"); return }

    setLoading(true)
    const res = await fetch("/api/give", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(finalAmount * 100),
        donorName,
        donorEmail,
        note,
        type: type.toLowerCase(),
        recurring,
      }),
    })
    setLoading(false)

    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      toast.error("Something went wrong. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preset amounts */}
      <div>
        <Label>Amount</Label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => { setAmount(String(a)); setCustom("") }}
              className={`px-4 py-2 rounded-full border text-sm transition-colors ${amount === String(a) && !custom ? "bg-primary text-primary-foreground border-primary" : "hover:bg-gray-50"}`}
            >
              ${a}
            </button>
          ))}
        </div>
        <div className="mt-2">
          <Input
            placeholder="Or enter custom amount"
            type="number"
            min="1"
            step="0.01"
            value={custom}
            onChange={(e) => { setCustom(e.target.value); setAmount("") }}
          />
        </div>
      </div>

      {/* Fund type */}
      <div className="space-y-1">
        <Label>Designate gift to</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {FUND_TYPES.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recurring */}
      <div className="flex items-center gap-2">
        <input
          id="recurring"
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="h-4 w-4"
        />
        <Label htmlFor="recurring" className="cursor-pointer">Make this a monthly recurring gift</Label>
      </div>

      {/* Donor info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Name (optional)</Label>
          <Input value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Email (optional)</Label>
          <Input type="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Note (optional)</Label>
        <Input placeholder="e.g. In memory of…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Redirecting…" : `Give ${finalAmount ? `$${finalAmount.toFixed(2)}` : ""}${recurring ? " / month" : ""}`}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Payments are processed securely by Stripe. You will be redirected to complete your gift.
      </p>
    </form>
  )
}
