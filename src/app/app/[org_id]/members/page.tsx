import { DataTable } from '@/components/data-table/data-table'
import { columns, Member } from '@/app/app/[org_id]/members/columns'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteMemberDialog from '@/components/invite-member-dialog'

export default async function Page({
  params,
}: {
  params: Promise<{ org_id: string }>;
}) {
  const { org_id } = await params;
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  if (userError) {
    console.error(userError);
  }
  const { data: org_memberships, error } = await supabase
    .from('org_memberships')
    .select('*, profiles!org_memberships_profiles_fkey(*)')
    .eq('org_id', org_id);

  if (error) {
    console.error(error);
  }
  const members = org_memberships?.map((org) => org?.profiles) as Member[];

  const { data: orgRoles } = await supabase
    .from('roles')
    .select('id, name, scope')
    .eq('org_id', org_id)
    .eq('scope', 'organization')

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('org_id', org_id)

  const teamRolesMap: Record<string, { id: string; name: string }[]> = {}
  if (teams && teams.length > 0) {
    const teamIds = teams.map((t) => t.id)
    const { data: teamRoles } = await supabase
      .from('roles')
      .select('id, name, team_id')
      .eq('scope', 'team')
      .in('team_id', teamIds)

    if (teamRoles) {
      for (const role of teamRoles) {
        const list = teamRolesMap[role.team_id as string] || []
        list.push({ id: role.id, name: role.name })
        teamRolesMap[role.team_id as string] = list
      }
    }
  }

  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto p-6'>
        <div className='flex items-center justify-between mb-8'>
          <h1 className='text-3xl font-bold'>Members</h1>
          <InviteMemberDialog
            orgId={org_id}
            orgRoles={orgRoles ?? []}
            teams={teams ?? []}
            teamRolesMap={teamRolesMap}
          />
        </div>
        <DataTable columns={columns} data={members} />
      </div>
    </div>
  )
}
