import { redirect } from "next/navigation"

interface Props {
  searchParams: Promise<{ categoryId?: string }>
}

export default async function ServiceMatrixRedirect({ searchParams }: Props) {
  const { categoryId } = await searchParams
  const qs = categoryId ? `?categoryId=${categoryId}` : ""
  redirect(`/mychurch/services/grid${qs}`)
}
