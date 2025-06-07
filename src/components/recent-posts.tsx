import { getQueryClient } from '@/components/providers/get-query-client'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import RecentPostsClient from './recent-posts-client'
import { fetchPosts } from '@/queries/posts'

interface RecentPostsProps {
  orgId: string
  teamId: string
}

export async function RecentPosts({ orgId, teamId }: RecentPostsProps) {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['posts', orgId, teamId],
    queryFn: () => fetchPosts(orgId, teamId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RecentPostsClient orgId={orgId} teamId={teamId} />
    </HydrationBoundary>
  )
}
