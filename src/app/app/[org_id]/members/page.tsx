import MembersTable from '@/components/members-table'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteMemberDialog } from '@/components/invite-member-dialog'
import { DashboardHeader } from '@/components/dashboard-header'
import { DashboardShell } from '@/components/dashboard-shell'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { api } from '@/queries'
import { membersKeys } from '@/queries/keys'

export default async function MembersPage({
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
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: membersKeys.list(org_id),
    queryFn: () => api.members.getAll(supabase, org_id),
  });

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
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>
        <DashboardHeader heading='Members'>
          <InviteMemberDialog
            orgId={org_id}
            orgRoles={orgRoles ?? []}
            teams={teams ?? []}
            teamRolesMap={teamRolesMap}
          />
        </DashboardHeader>
        <MembersTable orgId={org_id} />
      </DashboardShell>
    </HydrationBoundary>
  );
}
