import { AppSidebar } from '@/components/app-sidebar';
import Breadcrumbs from '@/components/breadcrumbs';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { createClient } from '@/lib/supabase/server';
import { api } from '@/queries';
import { organizationsKeys } from '@/queries/keys';
import { getQueryClient } from '@/components/providers/get-query-client';
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org_id: string }>;
}) {
  const { org_id } = await params;
  const supabase = await createClient();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: organizationsKeys.allWithTeams(),
    queryFn: () => api.organizations.getAllWithTeams(supabase),
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarProvider>
        <AppSidebar org_id={org_id} props={{}} />
        <SidebarInset>
        <header className='flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12'>
          <div className='flex items-center gap-2 px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator
              orientation='vertical'
              className='mr-2 data-[orientation=vertical]:h-4'
            />
            <Breadcrumbs />
          </div>
        </header>
        <div className='flex flex-1 flex-col gap-4 p-4 pt-0'>
          <div className='min-h-[100vh] flex-1 rounded-xl md:min-h-min'>
            {children}
          </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  );
}
