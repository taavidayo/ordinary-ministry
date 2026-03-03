import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma/client"
import { Role } from "../lib/generated/prisma/enums"
import { PrismaPg } from "@prisma/adapter-pg"
import { Pool } from "pg"
import bcrypt from "bcryptjs"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash("password123", 12)
  const admin = await db.user.upsert({
    where: { email: "admin@ordinaryministry.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@ordinaryministry.com",
      passwordHash,
      role: Role.ADMIN,
    },
  })
  console.log("Admin user:", admin.email)

  // Pages
  for (const page of [
    { slug: "about", title: "About Us", content: "We are a community gathered around Word, water, bread, and wine." },
    { slug: "get-involved", title: "Get Involved", content: "Join us on Sunday mornings and find a team to serve with." },
    { slug: "contact", title: "Contact", content: "Reach out to us at info@ordinaryministry.com." },
  ]) {
    await db.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    })
  }

  // Worship team
  const worshipTeam = await db.team.upsert({
    where: { id: "worship-team" },
    update: {},
    create: {
      id: "worship-team",
      name: "Worship",
      description: "Sunday worship team",
      roles: {
        create: [
          { name: "Worship Leader" },
          { name: "Vocalist" },
          { name: "Guitarist" },
          { name: "Pianist" },
          { name: "Drummer" },
        ],
      },
    },
  })
  console.log("Worship team:", worshipTeam.name)

  // Sample song
  const song = await db.song.upsert({
    where: { id: "amazing-grace" },
    update: {},
    create: {
      id: "amazing-grace",
      title: "Amazing Grace",
      author: "John Newton",
      genre: "Hymn",
      tags: ["grace", "salvation"],
      arrangements: {
        create: [
          {
            name: "Standard",
            chordproText: `{title: Amazing Grace}
{artist: John Newton}
{key: G}

{verse: 1}
[G]Amazing [G7]grace, how [C]sweet the [G]sound
That [G]saved a [Em]wretch like [D]me
[G]I once was [G7]lost, but [C]now I'm [G]found
Was [G]blind, but [D7]now I [G]see

{chorus}
[G]Praise [G7]God, [C]praise [G]God
[G]From [Em]whom all [D]blessings [D7]flow
[G]Praise [G7]God, [C]praise [G]God
[G]Praise [D]Father, Son, and [G]Ghost`,
          },
          {
            name: "Simplified",
            chordproText: `{title: Amazing Grace (Simplified)}
{key: C}

[C]Amazing grace, how [F]sweet the [C]sound
That [C]saved a wretch like [G]me
[C]I once was lost, but [F]now I'm [C]found
Was [C]blind, but now I [G]see [C]`,
          },
        ],
      },
    },
  })
  console.log("Sample song:", song.title)

  // Sample sermon
  await db.sermon.upsert({
    where: { slug: "the-word-became-flesh" },
    update: {},
    create: {
      title: "The Word Became Flesh",
      speaker: "Pastor James",
      date: new Date("2026-01-05"),
      description: "A study of John 1:1-18 and the incarnation of Christ.",
      slug: "the-word-became-flesh",
    },
  })

  // Sample event
  await db.event.create({
    data: {
      title: "Sunday Morning Service",
      description: "Join us for worship, Scripture, and communion.",
      startDate: new Date("2026-03-01T10:00:00"),
      location: "123 Church St",
    },
  }).catch(() => {}) // Ignore duplicate on re-seed

  console.log("Seed complete.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
