import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export async function fetchOrganizations() {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('organizations').select('id, name')
  if (error) throw new Error(error.message)
  return data
}

export async function fetchOrganization(orgId: string) {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single()
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
