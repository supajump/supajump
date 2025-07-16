import { createClient as createBrowserClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { queryOptionsFactory, QueryOpts, SupabaseEntityClient } from './query-factory'
import { useQuery } from '@tanstack/react-query'
import { entities } from './entities'


export const useOrganizations = (supabaseEntityClient: SupabaseEntityClient<Database>, options: QueryOpts<typeof entities['organizations']['rowType']> & { joins?: (keyof (typeof entities['organizations']['joins'])[])[] }) => {
  return useQuery(queryOptionsFactory(supabaseEntityClient, 'organizations', {
    ...options,
    joins: options.joins as (keyof (typeof entities['organizations']['joins']))[]
  }))
}


export const usePosts = (supabaseEntityClient: SupabaseEntityClient<Database>, options: QueryOpts<typeof entities['posts']['rowType']> & { joins?: (keyof (typeof entities['posts']['joins'])[])[] }) => {
  return useQuery(queryOptionsFactory(supabaseEntityClient, 'posts', {
    ...options,
    joins: options.joins as (keyof (typeof entities['posts']['joins']))[]
  }))
}

async function getAllWithTeams(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('organizations').select('*, teams(*)')
  if (error) throw new Error(error.message)
  return data
}

async function getAll(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.from('organizations').select('*')
  if (error) throw new Error(error.message)
  return data
}

async function getById(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function update(orgId: string, name: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
  if (error) throw new Error(error.message)
}

async function remove(orgId: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('organizations').delete().eq('id', orgId)
  if (error) throw new Error(error.message)
}

async function createWithTeam(orgName: string, teamName: string) {
  const supabase = createBrowserClient()
  const { data: newOrgId, error: orgError } = await supabase.rpc(
    'create_organization_and_add_current_user_as_owner',
    { name: orgName }
  )
  if (orgError || !newOrgId) {
    throw new Error(orgError?.message ?? 'Failed to create organization')
  }
  const { data: newTeamId, error: teamError } = await supabase.rpc(
    'create_team_and_add_current_user_as_owner',
    { team_name: teamName, input_org_id: newOrgId }
  )
  if (teamError || !newTeamId) {
    throw new Error(teamError?.message ?? 'Failed to create team')
  }
  return { orgId: newOrgId, teamId: newTeamId }
}

export const organizations = {
  getAll,
  getAllWithTeams,
  getById,
  update,
  remove,
  createWithTeam,
} as const
