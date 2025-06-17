'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useTeams } from '@/hooks/use-teams';
import { entities } from '@/queries/entities';
import { useParams } from 'next/navigation';

export function TeamsList() {
  const { org_id } = useParams();
  const { data: teams = [] } = useTeams(org_id as string);
  return (
    <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
      {teams?.map((team) => {
        const teamData = team as (typeof entities)['teams']['rowType'] & {
          id: string;
          organizations?: { id: string; name: string } | null;
        };
        const createdAt = teamData.created_at
          ? new Date(teamData.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : null;
        return (
          <Card key={teamData.id} className='hover:bg-muted'>
            <Link
              href={`/app/${teamData.org_id}/${teamData.id}`}
              className='block space-y-2 p-4'
            >
              <CardHeader className='p-0'>
                <CardTitle>{teamData.name}</CardTitle>
                {teamData.organizations?.name && (
                  <CardDescription>{teamData.organizations.name}</CardDescription>
                )}
              </CardHeader>
              {createdAt && (
                <CardContent className='p-0 text-sm text-muted-foreground'>
                  Created {createdAt}
                </CardContent>
              )}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
