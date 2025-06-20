
import MembersTable from '@/features/members/members-table'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteMemberModal } from '@/features/invitations/invite-member-modal'
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

  const orgRoles = await api.roles.getByScope(
    supabase,
    org_id,
    'organization',
  )

  const teams = await api.teams.getAll(supabase, org_id)

  const teamRolesMap: Record<string, { id: string; name: string }[]> = {}
  if (teams && teams.length > 0) {
    const teamIds = teams.map((t) => t.id)
    const teamRoles = await api.roles.getForTeams(supabase, teamIds)

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
          <InviteMemberModal
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
