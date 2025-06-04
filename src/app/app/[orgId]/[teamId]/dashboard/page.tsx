import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'

export default async function DashboardPage({ params }: { params: { orgId: string; teamId: string } }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-2">
      <p>Dashboard for {params.orgId} / {params.teamId}</p>
      <LogoutButton />
    </div>
  )
}
