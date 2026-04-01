import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = session.user?.role as string
  if (role !== "ADMIN" && role !== "LEADER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const responses = await db.formResponse.findMany({
    where: { formId: id },
    include: { fieldValues: { include: { field: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(responses)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { respondent, fieldValues } = body

  const form = await db.form.findUnique({ where: { id } })
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const response = await db.formResponse.create({
    data: {
      formId: id,
      respondent: respondent || null,
      fieldValues: {
        create: (fieldValues ?? []).map((fv: { fieldId: string; value: string }) => ({
          fieldId: fv.fieldId,
          value: fv.value ?? null,
        })),
      },
    },
    include: { fieldValues: true },
  })
  return NextResponse.json(response, { status: 201 })
}
