import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RecentPosts } from '@/features/posts/recent-posts';
import { CreatePostModal } from '@/features/posts/create-post-modal';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';

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
    <DashboardShell>
      <DashboardHeader heading='Dashboard' headingLevel={1} >
        <CreatePostModal orgId={org_id} teamId={team_id} />
      </DashboardHeader>
      <RecentPosts orgId={org_id} teamId={team_id} />
    </DashboardShell>
  );
}
