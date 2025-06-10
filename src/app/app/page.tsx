import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingForm from '@/components/onboarding-form';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { api } from '@/queries';
import { organizationsKeys } from '@/queries/keys';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/components/providers/get-query-client';

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
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [...organizationsKeys.all()],
    queryFn: () => api.organizations.getAll(supabase),
  });

  const dehydratedState = dehydrate(queryClient);

  if (
    !dehydratedState.data?.organizations ||
    dehydratedState.data.organizations.length === 0
  ) {
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
    <HydrationBoundary state={dehydratedState}>
      <div className='min-h-svh bg-background'>
        <div className='container mx-auto p-6'>
          <h1 className='mb-6 text-3xl font-bold'>Select Organization</h1>
          <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
            {dehydratedState.data?.organizations?.map((org) => (
              <Card key={org.id} className='hover:bg-muted'>
                <Link href={`/app/${org.id}`} className='block p-4'>
                  <CardHeader className='p-0'>
                    <CardTitle>{org.name}</CardTitle>
                  </CardHeader>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </HydrationBoundary>
  );
}
