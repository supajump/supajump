import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateRoleForm from '@/components/create-role-form'

export default async function RolesPage({
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

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('org_id', org_id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl">
        <h1 className="mb-6 text-3xl font-bold">Create Role</h1>
        <CreateRoleForm orgId={org_id} teams={teams ?? []} />
      </div>
    </div>
  )
}
