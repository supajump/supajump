"use client"

import { type Database } from "@/lib/database.types"
import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { PostOperations } from "./post-operations"
import { formatPostDate } from "./format-post-date"

export type Post = Database["public"]["Tables"]["posts"]["Row"]

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row, table }) => {
      const meta = table.options.meta
      const href =
        meta?.org_id && meta?.team_id
          ? `/app/${meta.org_id}/${meta.team_id}/posts/${row.original.id}`
          : `./${row.original.id}`
      return (
        <Link href={href} className="underline">
          {row.getValue("title") as string}
        </Link>
      )
    },
  },
  {
    accessorKey: "post_status",
    header: "Status",
  },
  {
    accessorKey: "post_type",
    header: "Type",
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) =>
      formatPostDate(row.getValue("created_at") as string),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => <PostOperations post={row.original} />,
  },
]
