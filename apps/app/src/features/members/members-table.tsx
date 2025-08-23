"use client"

import { DataTable } from "@/components/data-table/data-table"
import { columns, type Member } from "@/features/members/columns"
import { useMembers } from "@/hooks/use-members"

export default function MembersTable({ orgId }: { orgId: string }) {
  const { data = [] } = useMembers(orgId)
  return <DataTable columns={columns} data={data as Member[]} org_id={orgId} />
}
