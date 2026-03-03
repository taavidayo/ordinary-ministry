export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function GetInvolvedPage() {
  const page = await db.page.findUnique({ where: { slug: "get-involved" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">{page?.title ?? "Get Involved"}</h1>
      {page?.content ? (
        <p className="whitespace-pre-wrap leading-relaxed mb-8">{page.content}</p>
      ) : (
        <div className="space-y-6 mb-8">
          {[
            { title: "Attend a Service", desc: "Join us Sunday mornings at 10:00 AM. Everyone is welcome." },
            { title: "Join a Team", desc: "Serve with our worship, hospitality, or AV teams." },
            { title: "Connect", desc: "Meet with one of our leaders to learn more about membership." },
          ].map(({ title, desc }) => (
            <div key={title} className="border rounded-lg p-5">
              <h2 className="font-semibold text-lg mb-1">{title}</h2>
              <p className="text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      )}
      <Button asChild>
        <Link href="/contact">Reach Out</Link>
      </Button>
    </div>
  )
}
