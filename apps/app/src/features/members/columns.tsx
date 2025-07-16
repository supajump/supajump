'use client';

import { ColumnDef } from '@tanstack/react-table';
import { type Database } from '@/lib/database.types';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Member = Database['public']['Tables']['profiles']['Row'];

export const columns: ColumnDef<Member>[] = [
  {
    accessorKey: 'user_name',
    header: 'Name',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
  {
    accessorKey: 'roles',
    header: 'Roles',
  },
];
