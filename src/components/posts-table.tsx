'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPosts } from '@/queries/posts'
import { DataTable } from '@/components/data-table/data-table'
import { columns, type Post } from '@/app/app/[org_id]/[team_id]/posts/columns'

export default function PostsTable({
  orgId,
  teamId,
}: {
  orgId: string
  teamId: string
}) {
  const { data = [] } = useQuery({
    queryKey: ['posts', orgId, teamId],
    queryFn: () => fetchPosts(orgId, teamId),
  })

  return <DataTable columns={columns} data={data as Post[]} />
}
