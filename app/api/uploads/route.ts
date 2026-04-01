import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { writeFile, mkdir, readdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

export async function GET() {
  const uploadsDir = join(process.cwd(), "public", "uploads")
  try {
    const files = await readdir(uploadsDir)
    return NextResponse.json({
      files: files
        .filter(f => !f.startsWith("."))
        .map(f => ({ name: f, url: `/uploads/${f}` }))
        .reverse(), // newest first
    })
  } catch {
    return NextResponse.json({ files: [] })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const formData = await req.formData()
    const file = formData.get("file")
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // file is a File/Blob
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Sanitize original filename
    const originalName = (file as File).name ?? "upload"
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)
    const uniqueName = `${randomUUID()}-${safeName}`

    // Ensure uploads directory exists
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })

    const filePath = join(uploadDir, uniqueName)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      name: safeName,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
