'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { rolesKeys } from '@/queries/keys';
import { api } from '@/queries';

export function useRoles(orgId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rolesKeys.list(orgId),
    queryFn: () => api.roles.getAll(supabase, orgId),
  });
}
