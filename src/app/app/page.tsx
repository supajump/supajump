import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingForm from '@/components/onboarding-form'

export default async function AppPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: orgs } = await supabase.rpc('supajump.get_organizations_for_current_user')
  const { data: teams } = await supabase.rpc('supajump.get_teams_for_current_user')

  if (orgs && orgs.length > 0 && teams && teams.length > 0) {
    const orgId = orgs[0]
    const teamId = teams[0]
    redirect(`/app/${orgId}/${teamId}/dashboard`)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <OnboardingForm />
      </div>
    </div>
  )
}
