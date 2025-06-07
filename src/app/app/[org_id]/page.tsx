import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default async function OrgPage({
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

  const { data: teamIds } = await supabase.rpc('supajump.get_teams_for_current_user')

  if (!teamIds || teamIds.length === 0) {
    return (
      <div className='flex min-h-svh w-full items-center justify-center p-6'>
        <p className='text-sm text-muted-foreground'>No teams found.</p>
      </div>
    )
  }

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, org_id')
    .in('id', teamIds)
    .eq('org_id', org_id)

  if (teams && teams.length === 1) {
    redirect(`/app/${org_id}/${teams[0].id}/dashboard`)
  }

  return (
    <div className='min-h-svh bg-background'>
      <div className='container mx-auto p-6'>
        <h1 className='mb-6 text-3xl font-bold'>Select Team</h1>
        <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
          {teams?.map((team) => (
            <Card key={team.id} className='hover:bg-muted'>
              <Link href={`/app/${org_id}/${team.id}/dashboard`} className='block p-4'>
                <CardHeader className='p-0'>
                  <CardTitle>{team.name}</CardTitle>
                </CardHeader>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
