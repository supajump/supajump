import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/components/providers/get-query-client';
import { api } from '@/queries';
import { postsKeys } from '@/queries/keys';
import PostsTable from '@/features/posts/posts-table';
import { DashboardHeader } from '@/components/dashboard-header';
import { CreatePostModal } from '@/features/posts/create-post-modal';
import { DashboardShell } from '@/components/dashboard-shell';

export default async function Page({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string }>;
}) {
  const { org_id, team_id } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(org_id, team_id),
    queryFn: () => api.posts.getAll(supabase, org_id, team_id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>
        <DashboardHeader heading='Posts' headingLevel={1}>
          <CreatePostModal orgId={org_id} teamId={team_id} />
        </DashboardHeader>
        <PostsTable orgId={org_id} teamId={team_id} />
      </DashboardShell>
    </HydrationBoundary>
  );
}
