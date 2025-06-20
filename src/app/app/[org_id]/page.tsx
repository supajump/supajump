import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { api } from '@/queries';
import { teamsKeys } from '@/queries/keys';
import { getQueryClient } from '@/components/providers/get-query-client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { TeamsList } from '@/features/teams/teams-list';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';

export default async function OrgDashboardPage({
  params,
}: {
  params: Promise<{ org_id: string }>;
}) {
  const { org_id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const teams = await api.teams.getAll(supabase, org_id);

  if (!teams || teams.length === 0) {
    return (
      <div className='flex min-h-svh w-full items-center justify-center p-6'>
        <p className='text-sm text-muted-foreground'>No teams found.</p>
      </div>
    );
  }

  // if (teams && teams.length === 1) {
  //   redirect(`/app/${org_id}/${teams[0].id}/dashboard`);
  // }

  const queryClient = getQueryClient();
  await queryClient.setQueryData(teamsKeys.list(org_id), teams);

  const dehydratedState = dehydrate(queryClient);

  return (
    <DashboardShell>
      <DashboardHeader heading='Select Team' headingLevel={1} />
      <HydrationBoundary state={dehydratedState}>
        <TeamsList />
      </HydrationBoundary>
    </DashboardShell>
  );
}
