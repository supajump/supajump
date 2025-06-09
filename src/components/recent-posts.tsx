import { getQueryClient } from '@/components/providers/get-query-client';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import RecentPostsClient from './recent-posts-client';
import { getPosts } from '@/queries/posts';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

interface RecentPostsProps {
  orgId: string;
  teamId: string;
}

export async function RecentPosts({ orgId, teamId }: RecentPostsProps) {
  const supabase = createBrowserClient();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['posts', orgId, teamId, supabase],
    queryFn: () => getPosts(supabase, orgId, teamId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecentPostsClient orgId={orgId} teamId={teamId} />
    </HydrationBoundary>
  );
}
