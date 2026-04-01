import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import PrintButton from "./PrintButton"

interface SearchParams { email?: string; year?: string; userId?: string }

export default async function TaxStatementPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth()
  if (!session) redirect("/login")

  const { email, year: yearParam, userId } = await searchParams
  const role = session.user.role as string
  const sessionId = session.user.id as string
  const isAdmin = role === "ADMIN"

  // Non-admins can only see their own giving
  if (!isAdmin) {
    const viewer = await db.user.findUnique({ where: { id: sessionId }, select: { canViewGiving: true, email: true } })
    const isSelf = email === viewer?.email || userId === sessionId
    if (!isSelf && !viewer?.canViewGiving) redirect("/mychurch/dashboard")
  }

  const year = parseInt(yearParam ?? String(new Date().getFullYear()))

  // Resolve donor info
  let donorName: string | null = null
  let donorEmail: string | null = email ?? null
  let donorAddress: string | null = null

  if (userId) {
    const u = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true, address: true } })
    if (u) { donorName = u.name; donorEmail = u.email; donorAddress = u.address }
  }

  if (!donorEmail) redirect("/mychurch/giving")

  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999)

  const where = userId
    ? { OR: [{ userId }, { donorEmail }], createdAt: { gte: startDate, lte: endDate } }
    : { donorEmail, createdAt: { gte: startDate, lte: endDate } }

  const [offerings, orgSettings] = await Promise.all([
    db.offering.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.ministrySetting.findUnique({ where: { id: "default" }, select: { name: true } }),
  ])

  const total = offerings.reduce((s, o) => s + o.amount, 0)
  const orgName = orgSettings?.name ?? "Our Church"
  const displayName = donorName ?? (offerings[0]?.donorName ?? donorEmail)

  const availableYears = Array.from(
    new Set(
      await db.offering.findMany({ where: { donorEmail }, select: { createdAt: true }, orderBy: { createdAt: "desc" } })
        .then(rows => rows.map(r => r.createdAt.getFullYear()))
    )
  ).sort((a, b) => b - a)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Controls (hidden when printing) */}
      <div className="print:hidden flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Year:</span>
          {availableYears.length > 1 ? availableYears.map(y => (
            <a
              key={y}
              href={`/mychurch/giving/statement?email=${encodeURIComponent(donorEmail!)}&year=${y}${userId ? `&userId=${userId}` : ""}`}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${y === year ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {y}
            </a>
          )) : <span className="text-sm font-medium">{year}</span>}
        </div>
        <PrintButton />
      </div>

      {/* Statement */}
      <div className="border rounded-xl p-10 space-y-8 bg-white text-gray-900 print:border-0 print:p-0 print:shadow-none">
        {/* Header */}
        <div className="border-b pb-6">
          <h1 className="text-2xl font-bold tracking-tight">{orgName}</h1>
          <p className="text-sm text-gray-500 mt-1">Charitable Contribution Statement · Tax Year {year}</p>
        </div>

        {/* Donor */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Prepared For</p>
            <p className="font-semibold">{displayName}</p>
            {donorAddress && (() => {
              try {
                const a = JSON.parse(donorAddress)
                return <p className="text-sm text-gray-600">{a.street}{a.unit ? `, ${a.unit}` : ""}</p>
              } catch {
                return <p className="text-sm text-gray-600">{donorAddress}</p>
              }
            })()}
            <p className="text-sm text-gray-600">{donorEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date Issued</p>
            <p className="text-sm">{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        {/* Table */}
        {offerings.length > 0 ? (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Fund</th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Amount</th>
                <th className="text-right py-2 font-semibold text-gray-500 text-xs uppercase tracking-wider">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {offerings.map(o => (
                <tr key={o.id} className="border-b border-gray-100">
                  <td className="py-2">{new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="py-2">{o.category?.name ?? o.type ?? "General"}</td>
                  <td className="py-2 text-right tabular-nums">${(o.amount / 100).toFixed(2)}</td>
                  <td className="py-2 text-right font-mono text-xs text-gray-400">{(o.stripePaymentId ?? o.id).slice(-10)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-bold">
                <td colSpan={2} className="py-3">Total Contributions</td>
                <td className="py-3 text-right tabular-nums">${(total / 100).toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-sm text-gray-500 py-4">No contributions on record for {year}.</p>
        )}

        {/* Legal disclaimer */}
        <div className="border-t pt-6 space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            No goods or services were provided to the donor in exchange for these contributions, unless noted above.
            This statement serves as your official record for tax purposes. Please retain for your records.
          </p>
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong>{orgName}</strong> is a registered 501(c)(3) nonprofit organization.
            Contributions are tax-deductible to the extent permitted by applicable law.
          </p>
        </div>
      </div>
    </div>
  )
}
