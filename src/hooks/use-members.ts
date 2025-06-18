'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { membersKeys } from '@/queries/keys';
import { api } from '@/queries';

export function useMembers(orgId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: membersKeys.list(orgId),
    queryFn: () => api.members.getAll(supabase, orgId),
  });
}
