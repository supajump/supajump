import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import UpdateOrganizationForm from '@/components/update-organization-form'
import { DeleteOrganizationButton } from '@/components/delete-organization-button'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/components/providers/get-query-client'
import { fetchOrganization } from '@/queries/organizations'

export default async function OrganizationSettingsPage({
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

  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: ['organization', org_id],
    queryFn: () => fetchOrganization(org_id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='min-h-screen bg-background'>
        <div className='container mx-auto p-6 max-w-xl space-y-10'>
          <h1 className='text-3xl font-bold'>Organization Settings</h1>
          <UpdateOrganizationForm orgId={org_id} />
          <div className='pt-6 border-t'>
            <DeleteOrganizationButton orgId={org_id} />
          </div>
        </div>
      </div>
    </HydrationBoundary>
  )
}
