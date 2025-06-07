import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UpdateOrganizationForm from '@/components/update-organization-form'
import { DeleteOrganizationButton } from '@/components/delete-organization-button'

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

  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', org_id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-xl space-y-10">
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        {organization && <UpdateOrganizationForm organization={organization} />}
        <div className="pt-6 border-t">
          <DeleteOrganizationButton orgId={org_id} />
        </div>
      </div>
    </div>
  )
}
