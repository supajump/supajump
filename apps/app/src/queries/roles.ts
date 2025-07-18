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

async function getRoleById(
  supabase: SupabaseClient<Database>,
  roleId: string,
) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function getRolePermissions(
  supabase: SupabaseClient<Database>,
  roleId: string,
) {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('resource, action, scope, cascade_down, target_kind')
    .eq('role_id', roleId)
  if (error) throw new Error(error.message)
  return data || []
}

async function updateRolePermissions(
  supabase: SupabaseClient<Database>,
  roleId: string,
  permissions: Array<{
    role_id: string
    org_id: string
    team_id: string | null
    resource: string
    action: string
    scope: "all" | "own"
    cascade_down: boolean
    target_kind: string | null
  }>
) {
  // First, delete all existing permissions for this role
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) throw new Error(deleteError.message)

  // Insert new permissions if any
  if (permissions.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(permissions)

    if (insertError) throw new Error(insertError.message)
  }

  return { success: true }
}

export const roles = {
  getAll: getRoles,
  getByScope: getRolesByScope,
  getForTeams: getRolesForTeams,
  findUnique: getRoleById,
  getPermissions: getRolePermissions,
  updatePermissions: updateRolePermissions,
} as const;
