"use client"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { type Database } from "@/lib/database.types"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { RoleOperations } from "./role-operations"

export type Role = Database["public"]["Tables"]["roles"]["Row"]

export const columns: ColumnDef<Role>[] = [
  {
    id: "select",
    accessorKey: "id",
    size: 40,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "display_name",
    header: "Name",
    cell: ({ row, table }) => {
      return (
        <Link
          href={`/app/${table.options.meta?.org_id}/roles/${row.original.id}/edit`}
        >
          {row.original.display_name}
        </Link>
      )
    },
  },
  {
    accessorKey: "scope",
    header: "Scope",
    cell: ({ row }) => {
      return <Badge>{row.original.scope}</Badge>
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      return <p>{row.original.description}</p>
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <RoleOperations role={row.original} />,
  },
]
