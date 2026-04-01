import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { FormFieldType } from "@/lib/generated/prisma/enums"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { fields } = await req.json()

  // Replace all fields atomically
  await db.formField.deleteMany({ where: { formId: id } })

  if (fields && fields.length > 0) {
    await db.formField.createMany({
      data: fields.map((f: {
        type: string; label: string; description?: string;
        required?: boolean; order: number; config?: unknown
      }, i: number) => ({
        formId: id,
        type: f.type as FormFieldType,
        label: f.label,
        description: f.description ?? null,
        required: f.required ?? false,
        order: i,
        config: f.config ?? null,
      })),
    })
  }

  const updated = await db.form.findUnique({
    where: { id },
    include: { fields: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json(updated)
}
