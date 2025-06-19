import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteMemberForm from '@/components/invite-member-form'
import { api } from '@/queries'

export default async function InvitePage({
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl">
        <h1 className="mb-6 text-3xl font-bold">Invite Member</h1>
        <InviteMemberForm
          orgId={org_id}
          orgRoles={orgRoles ?? []}
          teams={teams ?? []}
          teamRolesMap={teamRolesMap}
        />
      </div>
    </div>
  )
}
