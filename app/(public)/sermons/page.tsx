export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import Link from "next/link"

export default async function SermonsPage() {
  const sermons = await db.sermon.findMany({ orderBy: { date: "desc" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Sermons</h1>
      {sermons.length === 0 && <p className="text-muted-foreground">No sermons yet.</p>}
      <div className="space-y-6">
        {sermons.map((s) => (
          <Link key={s.id} href={`/sermons/${s.slug}`} className="block border rounded-lg p-5 hover:shadow-md transition-shadow">
            <p className="text-sm text-muted-foreground mb-1">
              {new Date(s.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
            <h2 className="text-xl font-semibold mb-1">{s.title}</h2>
            <p className="text-muted-foreground text-sm">{s.speaker}</p>
            {s.description && <p className="text-sm mt-2 line-clamp-2">{s.description}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
