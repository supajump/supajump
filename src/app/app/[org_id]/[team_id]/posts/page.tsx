import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/components/providers/get-query-client';
import { api } from '@/queries';
import { postsKeys } from '@/queries/keys';
import PostsTable from '@/components/posts-table';

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
    queryKey: [...postsKeys.list(org_id, team_id)],
    queryFn: () => api.posts.getAll(supabase, org_id, team_id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='flex flex-col gap-4'>
        <h1 className='text-2xl font-bold'>Posts</h1>
        <PostsTable orgId={org_id} teamId={team_id} />
      </div>
    </HydrationBoundary>
  );
}
