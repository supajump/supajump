import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteMemberModal } from '@/components/invite-member-modal'
import { api } from '@/queries'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardHeader } from '@/components/dashboard-header'
import {
  dehydrate,
  HydrationBoundary
} from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { invitationsKeys } from '@/queries/keys'
import { InvitationsTable } from '@/components/invitations-table'

export default async function InvitationsPage({
  params,
}: {
  params: Promise<{ org_id: string }>
}) {
  const { org_id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

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

  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: invitationsKeys.list(org_id),
    queryFn: () => api.invitations.getAll(supabase, org_id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>
        <DashboardHeader heading='Invitations' >
          <InviteMemberModal
            orgId={org_id}
            orgRoles={orgRoles ?? []}
            teams={teams ?? []}
            teamRolesMap={teamRolesMap}
          />
        </DashboardHeader>
        <InvitationsTable orgId={org_id} />
      </DashboardShell>
    </HydrationBoundary>
  )
}
