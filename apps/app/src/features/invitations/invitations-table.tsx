"use client"

import { DataTable } from "@/components/data-table/data-table"
import { columns, type Invitation } from "@/features/invitations/columns"
import { useInvitations } from "@/hooks/use-invitations"

export function InvitationsTable({ orgId }: { orgId: string }) {
  const { data = [] } = useInvitations(orgId)
  return (
    <DataTable columns={columns} data={data as Invitation[]} org_id={orgId} />
  )
}
