'use client'

import { ColumnDef } from '@tanstack/react-table'
import { type Database } from '@/lib/database.types'

export type Role = Database['public']['Tables']['roles']['Row']

export const columns: ColumnDef<Role>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'scope',
    header: 'Scope',
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
]
