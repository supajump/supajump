'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { fetchOrganizations } from '@/queries/organizations'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export default function OrganizationsList() {
  const { data: organizations = [] } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
  })

  return (
    <div className='grid gap-6 sm:grid-cols-2 md:grid-cols-3'>
      {organizations.map((org) => (
        <Card key={org.id} className='hover:bg-muted'>
          <Link href={`/app/${org.id}`} className='block p-4'>
            <CardHeader className='p-0'>
              <CardTitle>{org.name}</CardTitle>
            </CardHeader>
          </Link>
        </Card>
      ))}
    </div>
  )
}
