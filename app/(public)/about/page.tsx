export const dynamic = "force-dynamic"

import { db } from "@/lib/db"

export default async function AboutPage() {
  const page = await db.page.findUnique({ where: { slug: "about" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">{page?.title ?? "About Us"}</h1>
      {page?.content ? (
        <div className="prose max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed">{page.content}</p>
        </div>
      ) : (
        <p className="text-muted-foreground">
          We are a local church gathered around the ordinary means of grace — the preaching of God&apos;s Word,
          baptism, and the Lord&apos;s Supper. We believe that it is through these ordinary things that God
          does his extraordinary work in the lives of his people.
        </p>
      )}
    </div>
  )
}
