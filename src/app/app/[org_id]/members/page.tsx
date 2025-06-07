import { DataTable } from '@/components/data-table/data-table';
import { columns, Member } from '@/app/app/[org_id]/members/columns';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ org_id: string }>;
}) {
  const { org_id } = await params;
  const supabase = await createClient();
  const { data: user, error: userError } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  if (userError) {
    console.error(userError);
  }
  const { data: org_memberships, error } = await supabase
    .from('org_memberships')
    .select('*, profiles!org_memberships_profiles_fkey(*)')
    .eq('org_id', org_id);

  if (error) {
    console.error(error);
  }
  const members = org_memberships?.map((org) => org?.profiles) as Member[];
  console.log(members);
  return (
    <div className='flex flex-col gap-4'>
      <h1 className='text-2xl font-bold'>Members</h1>
      {JSON.stringify(members)}
      <DataTable columns={columns} data={members} />
    </div>
  );
}
