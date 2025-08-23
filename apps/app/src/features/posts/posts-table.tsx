"use client"

import { DataTable } from "@/components/data-table/data-table"
import { columns, type Post } from "@/features/posts/columns"
import { usePosts } from "@/features/posts/hooks/use-posts"

export default function PostsTable({
  orgId,
  teamId,
}: {
  orgId: string
  teamId: string
}) {
  const { data = [] } = usePosts(orgId, teamId)

  return <DataTable columns={columns} data={data as Post[]} org_id={orgId} />
}
