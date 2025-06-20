'use client';

import { usePosts } from '@/hooks/use-posts';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Post } from '@/app/app/[org_id]/[team_id]/posts/columns';

export default function PostsTable({
  orgId,
  teamId,
}: {
  orgId: string;
  teamId: string;
}) {
  const { data = [] } = usePosts(orgId, teamId);

  return <DataTable columns={columns} data={data as Post[]} />;
}
