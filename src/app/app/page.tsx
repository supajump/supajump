import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OnboardingForm from '@/components/onboarding-form';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/components/providers/get-query-client';
import { fetchOrganizations } from '@/queries/organizations';
import OrganizationsList from '@/components/organizations-list';
import type { Database } from '@/lib/database.types';

type Organization = Database['public']['Tables']['organizations']['Row'];

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  });

  const organizations = queryClient.getQueryData<Organization[]>([
    'organizations',
  ]);
  if (!organizations || organizations.length === 0) {
    return (
      <div className='flex min-h-svh w-full items-center justify-center p-6'>
        <div className='w-full max-w-sm'>
          <OnboardingForm />
        </div>
      </div>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='min-h-svh bg-background'>
        <div className='container mx-auto p-6'>
          <h1 className='mb-6 text-3xl font-bold'>Select Organization</h1>
          <OrganizationsList />
        </div>
      </div>
    </HydrationBoundary>
  );
}
