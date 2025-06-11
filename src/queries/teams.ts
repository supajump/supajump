import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

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
