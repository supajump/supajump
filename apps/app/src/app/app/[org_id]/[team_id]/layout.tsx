import { isUuid } from "@/lib/is-uuid"
import { notFound } from "next/navigation"

export default async function TeamLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ team_id: string }>
}) {
  const { team_id } = await params

  if (!isUuid(team_id)) {
    notFound()
  }

  return children
}
