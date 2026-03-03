import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function OfferingsPage() {
  const offerings = await db.offering.findMany({ orderBy: { createdAt: "desc" } })
  const total = offerings.reduce((sum, o) => sum + o.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Offerings</h1>
        <p className="text-lg font-semibold">
          Total: ${(total / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offerings.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{o.donorName || "Anonymous"}</p>
                    {o.donorEmail && <p className="text-xs text-muted-foreground">{o.donorEmail}</p>}
                  </TableCell>
                  <TableCell className="font-medium">
                    ${(o.amount / 100).toFixed(2)} {o.currency.toUpperCase()}
                  </TableCell>
                  <TableCell>
                    {o.type && <Badge variant="outline" className="text-xs capitalize">{o.type}</Badge>}
                  </TableCell>
                  <TableCell>
                    {o.recurring && <Badge variant="secondary" className="text-xs">Monthly</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{o.note}</TableCell>
                </TableRow>
              ))}
              {offerings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No offerings yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
