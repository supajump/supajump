import RolesTable from '@/components/roles-table'
import CreateRoleForm from '@/components/create-role-form'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { api } from '@/queries'
import { rolesKeys } from '@/queries/keys'

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
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rolesKeys.list(org_id),
    queryFn: () => api.roles.getAll(supabase, org_id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 max-w-xl">
          <h1 className="mb-6 text-3xl font-bold">Create Role</h1>
          <CreateRoleForm orgId={org_id} teams={teams ?? []} />
        </div>
        <div className="container mx-auto p-6">
          <h2 className="mb-4 text-2xl font-bold">Roles</h2>
          <RolesTable orgId={org_id} />
        </div>
      </div>
    </HydrationBoundary>
  )
}
