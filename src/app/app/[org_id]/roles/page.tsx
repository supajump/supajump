import { DataTable } from '@/components/data-table/data-table'
import CreateRoleForm from '@/components/create-role-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { columns, type Role } from './columns'

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

  const { data: roles } = await supabase
    .from('roles')
    .select('*')
    .eq('org_id', org_id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl">
        <h1 className="mb-6 text-3xl font-bold">Create Role</h1>
        <CreateRoleForm orgId={org_id} teams={teams ?? []} />
      </div>
      <div className="container mx-auto p-6">
        <h2 className="mb-4 text-2xl font-bold">Roles</h2>
        <DataTable columns={columns} data={(roles ?? []) as Role[]} />
      </div>
    </div>
  )
}
