'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useOrganizations } from '@/hooks/use-organization';
import { entities } from '@/queries/entities';

export function OrganizationsList() {
  const { data: organizations = [] } = useOrganizations();

  return (
    <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
      {organizations?.map((org) => {
        const organization =
          org as (typeof entities)['organizations']['rowType'] & { id: string };
        const createdAt = organization.created_at
          ? new Date(organization.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : null;
        return (
          <Card key={organization.id} className='hover:bg-muted'>
            <Link href={`/app/${organization.id}`} className='block space-y-2 p-4'>
              <CardHeader className='p-0'>
                <CardTitle>{organization.name}</CardTitle>
                {organization.type && (
                  <CardDescription className='capitalize'>
                    {organization.type}
                  </CardDescription>
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
