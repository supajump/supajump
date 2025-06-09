'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/queries';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarIcon, FileTextIcon } from 'lucide-react';
import { createClient as createBrowserClient } from '@/lib/supabase/client';

interface RecentPostsClientProps {
  orgId: string;
  teamId: string;
}

export default function RecentPostsClient({
  orgId,
  teamId,
}: RecentPostsClientProps) {
  const supabase = createBrowserClient();
  const {
    data: posts,
    error,
    isLoading,
  } = useQuery({
    queryKey: ['posts', orgId, teamId, supabase],
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading posts</div>;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'article':
        return <FileTextIcon className='h-4 w-4' />;
      case 'announcement':
        return <CalendarIcon className='h-4 w-4' />;
      default:
        return <FileTextIcon className='h-4 w-4' />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (!posts || posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <FileTextIcon className='h-5 w-5' />
            Recent Posts
          </CardTitle>
          <CardDescription>Your team&apos;s latest posts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-center py-8'>
            No posts yet. Create your first post to get started!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <FileTextIcon className='h-5 w-5' />
          Recent Posts
        </CardTitle>
        <CardDescription>Your team&apos;s latest posts</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        {posts.map((post) => (
          <div
            key={post.id}
            className='flex flex-col space-y-2 p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors'
          >
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                  {getPostTypeIcon(post.post_type)}
                  <h3 className='font-medium text-sm'>{post.title}</h3>
                  <Badge
                    variant='secondary'
                    className={`text-xs ${getStatusColor(post.post_status)}`}
                  >
                    {post.post_status}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-sm mb-2'>
                  {truncateContent(post?.content ?? '')}
                </p>
                <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                  <span className='flex items-center gap-1'>
                    <CalendarIcon className='h-3 w-3' />
                    {formatDate(post?.created_at ?? '')}
                  </span>
                  <span className='capitalize'>{post.post_type}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
