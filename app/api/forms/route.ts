import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const forms = await db.form.findMany({
    include: { event: true, _count: { select: { responses: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(forms)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, description, eventId, templateId, googleSheetUrl } = body
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let seedFields: any[] = []

  if (templateId) {
    const template = await db.formTemplate.findUnique({
      where: { id: templateId },
      include: { fields: { orderBy: { order: "asc" } } },
    })
    if (template) {
      seedFields = template.fields.map((f) => ({
        type: f.type,
        label: f.label,
        description: f.description ?? null,
        required: f.required,
        order: f.order,
        config: f.config ?? null,
      }))
    }
  }

  const form = await db.form.create({
    data: {
      title,
      description: description || null,
      eventId: eventId || null,
      templateId: templateId || null,
      googleSheetUrl: googleSheetUrl || null,
      fields: seedFields.length > 0 ? { create: seedFields } : undefined,
    },
    include: { fields: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json(form, { status: 201 })
}
