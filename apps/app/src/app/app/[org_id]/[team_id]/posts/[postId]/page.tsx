import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PostEditor from '@features/posts/post-editor';
import { api } from '@/queries';
import { DashboardShell } from '@/components/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard-header';

export default async function Page({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string; postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

  const post = await api.posts.getById(supabase, postId);

  if (!post) {
    notFound();
  }

  return (
    <DashboardShell>
      <DashboardHeader heading={post.title ?? 'Post'} headingLevel={1} />
      <PostEditor postId={post.id} initialContent={post.content} />
    </DashboardShell>
  );
}
