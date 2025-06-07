import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import PostEditor from '@/components/post-editor';

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

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single();

  if (error || !post) {
    return <div className='p-6'>Post not found</div>;
  }

  return (
    <div className='p-6'>
      <h1 className='mb-4 text-2xl font-bold'>{post.title}</h1>
      <PostEditor postId={post.id} initialContent={post.content} />
    </div>
  );
}
