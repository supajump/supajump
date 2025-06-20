import RolesTable from '@features/roles/roles-table'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { api } from '@/queries'
import { rolesKeys } from '@/queries/keys'
import { CreateRoleModal } from '@features/roles/create-role-modal'
import { DashboardShell } from '@/components/dashboard-shell'
import { DashboardHeader } from '@/components/dashboard-header'

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

  const teams = await api.teams.getAll(supabase, org_id)
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rolesKeys.list(org_id),
    queryFn: () => api.roles.getAll(supabase, org_id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardShell>
        <DashboardHeader heading='Roles' headingLevel={1} >
          <CreateRoleModal orgId={org_id} teams={teams} />
        </DashboardHeader>
        <RolesTable orgId={org_id} />
      </DashboardShell>
    </HydrationBoundary>
  )
}
