'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { teamsKeys } from '@/queries/keys'
import { api } from '@/queries'

export function useTeams(orgId: string) {
  const supabase = createBrowserClient()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: teamsKeys.list(orgId),
    queryFn: () => api.teams.getAll(supabase, orgId),
  })
}

export function useTeam(teamId: string) {
  const supabase = createBrowserClient()
  return useQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: teamsKeys.detail(teamId),
    queryFn: () => api.teams.getById(supabase, teamId),
  })
}
