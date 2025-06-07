'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

function getSearchPathnames(searchParams: ReturnType<typeof useSearchParams>) {
  const params = searchParams.getAll('pathname')
  if (params.length > 0) return params
  const param = searchParams.get('pathnames')
  if (param) return param.split('/').filter(Boolean)
  return []
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const searchSegments = getSearchPathnames(searchParams)
  const segments =
    searchSegments.length > 0
      ? searchSegments
      : pathname
          .split('?')[0]
          .split('/')
          .filter(Boolean)

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const name = decodeURIComponent(segment.replace(/-/g, ' '))
    return { href, name }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((bc, idx) => (
          <React.Fragment key={bc.href}>
            <BreadcrumbItem>
              {idx === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{bc.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={bc.href}>{bc.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {idx !== breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

