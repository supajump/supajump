'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { invitationsKeys } from '@/queries/keys';
import { api } from '@/queries';

export function useInvitations(orgId: string) {
  const supabase = createBrowserClient();
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: invitationsKeys.list(orgId),
    queryFn: () => api.invitations.getAll(supabase, orgId),
  });
}
