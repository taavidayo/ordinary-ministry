import GiveForm from "@/components/public/GiveForm"

export default function GivePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Give</h1>
      <p className="text-muted-foreground mb-8">
        Your generosity supports our ministry and community. All giving is processed securely through Stripe.
      </p>
      <GiveForm />
    </div>
  )
}
