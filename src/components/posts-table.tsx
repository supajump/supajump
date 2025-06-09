'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/queries';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Post } from '@/app/app/[org_id]/[team_id]/posts/columns';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

export default function PostsTable({
  orgId,
  teamId,
}: {
  orgId: string;
  teamId: string;
}) {
  const supabase = createBrowserClient();
  const { data = [] } = useQuery({
    queryKey: ['posts', orgId, teamId, supabase],
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  });

  return <DataTable columns={columns} data={data as Post[]} />;
}
