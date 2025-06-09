import { createClient as createServerClient } from '@/lib/supabase/server'
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

export async function fetchOrganizations(supabase: SupabaseClient<Database>, filters?: Record<string, unknown>) {
  let query = supabase.from('organizations').select('id, name')
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value as string)
    })
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function fetchOrganization(supabase: SupabaseClient<Database>, filters?: Record<string, unknown>) {
  let query = supabase.from('organizations').select('*')
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value as string)
    })
  }
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function updateOrganization(orgId: string, name: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)
  if (error) throw new Error(error.message)
}

export async function deleteOrganization(orgId: string) {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('organizations').delete().eq('id', orgId)
  if (error) throw new Error(error.message)
}

export async function createOrganizationAndTeam(orgName: string, teamName: string) {
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
    { team_name: teamName, org_id: newOrgId }
  )
  if (teamError || !newTeamId) {
    throw new Error(teamError?.message ?? 'Failed to create team')
  }
  return { orgId: newOrgId, teamId: newTeamId }
}
