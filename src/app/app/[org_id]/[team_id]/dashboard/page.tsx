import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';
import { RecentPosts } from '@/components/recent-posts';
import { CreatePostModal } from '@/components/create-post-modal';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string }>;
}) {
  const { org_id, team_id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect('/auth/login');
  }

  if (!data?.user) {
    redirect('/auth/login');
  }

  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto p-6'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl font-bold'>Dashboard</h1>
            <p className='text-muted-foreground'>
              Organization: {org_id} / Team: {team_id}
            </p>
          </div>
          <div className='flex items-center gap-4'>
            <CreatePostModal orgId={org_id} teamId={team_id} />
            <LogoutButton />
          </div>
        </div>

        {/* Main Content */}
        <div className='grid gap-6'>
          <RecentPosts orgId={org_id} teamId={team_id} />
        </div>
      </div>
    </div>
  );
}
