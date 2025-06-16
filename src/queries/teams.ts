import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { queryOptionsFactory, QueryOpts, SupabaseEntityClient } from './query-factory'
import { entities } from './entities'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export const useTeams = (supabaseEntityClient: SupabaseEntityClient<Database>, options: QueryOpts<typeof entities['teams']['rowType']> & { joins?: (keyof (typeof entities['teams']['joins'])[])[] }) => {
  return useQuery(queryOptionsFactory(supabaseEntityClient, 'teams', {
    ...options,
    joins: options.joins as (keyof (typeof entities['teams']['joins']))[]
  }))
}

async function getTeams(
  supabase: SupabaseClient<Database>,
  orgId: string
) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('org_id', orgId)
    .order('name', { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

async function getTeam(supabase: SupabaseClient<Database>, teamId: string) {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function createTeam(orgId: string, teamName: string) {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.rpc(
    'create_team_and_add_current_user_as_owner',
    { team_name: teamName, org_id: orgId }
  )
  if (error || !data) {
    throw new Error(error?.message ?? 'Failed to create team')
  }
  return data
}

export const teams = {
  getAll: getTeams,
  getById: getTeam,
  create: createTeam,
} as const
