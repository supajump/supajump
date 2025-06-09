'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { postsKeys } from '@/queries/keys';
import { api } from '@/queries';

export function usePosts(orgId: string, teamId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...postsKeys.list(orgId, teamId), supabase.supabaseUrl],
    queryFn: () => api.posts.getAll(supabase, orgId, teamId),
  });
}
