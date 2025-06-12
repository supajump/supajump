import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useQuery } from '@tanstack/react-query'
import { queryOptionsFactory, QueryOpts, SupabaseEntityClient } from './query-factory'
import { entities } from './entities'

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

export const teams = {
  getAll: getTeams,
  getById: getTeam,
} as const
