import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getRoles(
  supabase: SupabaseClient<Database>,
  orgId: string,
) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
  return data;
}

async function getRolesByScope(
  supabase: SupabaseClient<Database>,
  orgId: string,
  scope: string,
) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('org_id', orgId)
    .eq('scope', scope)
  if (error) throw new Error(error.message)
  return data
}

async function getRolesForTeams(
  supabase: SupabaseClient<Database>,
  teamIds: string[],
) {
  if (teamIds.length === 0) return []
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('scope', 'team')
    .in('team_id', teamIds)
  if (error) throw new Error(error.message)
  return data
}

export const roles = {
  getAll: getRoles,
  getByScope: getRolesByScope,
  getForTeams: getRolesForTeams,
} as const;
