'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useTeams } from '@/queries/teams';
import { SupabaseEntityClient } from '@/queries/query-factory';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { entities } from '@/queries/entities';

export function TeamsList() {
  const supabase = createBrowserClient();
  const supabaseEntityClient = new SupabaseEntityClient(supabase);
  const { data: teams = { data: [], count: null } } = useTeams(
    supabaseEntityClient,
    {
      filters: {},
      sort: 'name',
    }
  );

  return (
    <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
      {teams.data?.map((team) => {
        const teamData = team as (typeof entities)['teams']['rowType'] & {
          id: string;
        };
        return (
          <Card key={teamData.id} className='hover:bg-muted'>
            <Link
              href={`/app/${teamData.org_id}/${teamData.id}/dashboard`}
              className='block p-4'
            >
              <CardHeader className='p-0'>
                <CardTitle>{teamData.name}</CardTitle>
              </CardHeader>
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
