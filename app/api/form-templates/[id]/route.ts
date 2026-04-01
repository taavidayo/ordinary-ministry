import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { FormFieldType } from "@/lib/generated/prisma/enums"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const template = await db.formTemplate.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  })
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  if (body.fields !== undefined) {
    await db.formTemplateField.deleteMany({ where: { templateId: id } })
    if (body.fields.length > 0) {
      await db.formTemplateField.createMany({
        data: body.fields.map((f: {
          type: string; label: string; description?: string;
          required?: boolean; order: number; config?: unknown
        }, i: number) => ({
          templateId: id,
          type: f.type as FormFieldType,
          label: f.label,
          description: f.description ?? null,
          required: f.required ?? false,
          order: i,
          config: f.config ?? null,
        })),
      })
    }
  }

  const template = await db.formTemplate.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description || null }),
    },
    include: { fields: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json(template)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.formTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
