import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/onboarding-form';
import { api } from '@/queries';
import { organizationsKeys } from '@/queries/keys';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/components/providers/get-query-client';
import { OrganizationsList } from '@/components/organizations-list';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const organizations = await api.organizations.getAll(supabase);

  const queryClient = getQueryClient();
  await queryClient.setQueryData(organizationsKeys.all(), organizations);

  const dehydratedState = dehydrate(queryClient);

  if (!organizations || organizations.length === 0) {
    return (
      <div className='flex min-h-svh w-full items-center justify-center p-6'>
        <div className='w-full max-w-sm'>
          <OnboardingForm />
        </div>
      </div>
    );
  }

  // if (organizations.length === 1) {
  //   redirect(`/app/${organizations[0].id}`);
  // }

  return (
    <DashboardShell>
      <div className='container mx-auto p-6'>
        <DashboardHeader heading='Select Organization' headingLevel={1} />
        <HydrationBoundary state={dehydratedState}>
          <OrganizationsList />
        </HydrationBoundary>
      </div>
    </DashboardShell>
  );
}
