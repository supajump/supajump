import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/logout-button';

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
    <div className='flex h-svh w-full flex-col items-center justify-center gap-2'>
      <p>
        Dashboard for {org_id} / {team_id}
      </p>
      <LogoutButton />
    </div>
  );
}
