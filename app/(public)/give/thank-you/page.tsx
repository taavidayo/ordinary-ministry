import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ThankYouPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-5xl mb-6">🙏</div>
      <h1 className="text-3xl font-bold mb-3">Thank You!</h1>
      <p className="text-muted-foreground mb-8">
        Your gift has been received. We are so grateful for your generosity.
      </p>
      <div className="flex gap-3 justify-center">
        <Button asChild><Link href="/">Go Home</Link></Button>
        <Button asChild variant="outline"><Link href="/give">Give Again</Link></Button>
      </div>
    </div>
  )
}
