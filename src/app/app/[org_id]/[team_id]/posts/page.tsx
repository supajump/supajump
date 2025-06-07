import { DataTable } from '@/components/data-table/data-table';
import { columns, type Post } from './columns';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string }>;
}) {
  const { org_id, team_id } = await params;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }
  const { data: posts, error } = await supabase
    .from('posts')
    .select('*')
    .eq('org_id', org_id)
    .eq('team_id', team_id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
  }

  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Posts</h1>
      <DataTable columns={columns} data={(posts ?? []) as Post[]} />
    </div>
  );
}
