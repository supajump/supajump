'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { organizationsKeys } from '@/queries/keys';
import { api } from '@/queries';

export function useOrganization(orgId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...organizationsKeys.detail(orgId), supabase.supabaseUrl],
    queryFn: () => api.organizations.getById(supabase, orgId),
  });
}
