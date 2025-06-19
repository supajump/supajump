import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UpdateTeamForm from '@/components/update-team-form'
import { DeleteTeamButton } from '@/components/delete-team-button'
import { api } from '@/queries'

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string }>
}) {
  const { org_id, team_id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const team = await api.teams.getById(supabase, team_id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl space-y-10">
        <h1 className="text-3xl font-bold">Team Settings</h1>
        {team && <UpdateTeamForm team={team} />}
        <div className="pt-6 border-t space-y-2">
          <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting this team will permanently remove its posts and data.
          </p>
          <DeleteTeamButton orgId={org_id} teamId={team_id} />
        </div>
      </div>
    </div>
  )
}
