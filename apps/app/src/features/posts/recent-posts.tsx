import { getQueryClient } from '@/components/providers/get-query-client';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import RecentPostsClient from './recent-posts-client';
import { api } from '@/queries';
import { postsKeys } from '@/queries/keys';
import { createClient } from '@/lib/supabase/server';

interface RecentPostsProps {
  orgId: string;
  teamId: string;
}

export async function RecentPosts({ orgId, teamId }: RecentPostsProps) {
  const supabase = await createClient();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: postsKeys.list(orgId, teamId),
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecentPostsClient orgId={orgId} teamId={teamId} />
    </HydrationBoundary>
  );
}
