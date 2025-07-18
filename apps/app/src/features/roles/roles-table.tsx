"use client"

import { DataTable } from "@/components/data-table/data-table"
import { columns, type Role } from "@/features/roles/columns"
import { useRoles } from "@/hooks/use-roles"

export default function RolesTable({ orgId }: { orgId: string }) {
  const { data = [] } = useRoles(orgId)

  return <DataTable columns={columns} data={data as Role[]} org_id={orgId} />
}
