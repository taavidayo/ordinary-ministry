"use client"

import GiveForm from "./GiveForm"
import type { GiveBlock } from "@/lib/page-blocks"

export default function GiveBlockContent({ block }: { block: GiveBlock }) {
  const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
  return (
    <section style={s} className="py-8 px-6 h-full">
      <div className="max-w-lg mx-auto">
        {block.heading && <h2 className="text-2xl font-bold mb-2">{block.heading}</h2>}
        {block.description && <p className="text-muted-foreground mb-6">{block.description}</p>}
        <GiveForm />
      </div>
    </section>
  )
}
