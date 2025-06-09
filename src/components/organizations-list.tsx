'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganizations } from '@/queries/organizations';
import { SupabaseEntityClient } from '@/queries/query-factory';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { entities } from '@/queries/entities';

export default function OrganizationsList() {
  const supabase = createBrowserClient();
  const supabaseEntityClient = new SupabaseEntityClient(supabase);
  const { data: organizations = { data: [], count: null } } = useOrganizations(
    supabaseEntityClient,
    {
      filters: {},
      sort: 'name',
    }
  );

  return (
    <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
      {organizations.data?.map((org) => {
        const organization =
          org as (typeof entities)['organizations']['rowType'] & { id: string };
        return (
          <Card key={organization.id} className='hover:bg-muted'>
            <Link href={`/app/${organization.id}`} className='block p-4'>
              <CardHeader className='p-0'>
                <CardTitle>{organization.name}</CardTitle>
              </CardHeader>
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
