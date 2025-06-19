'use client';

import { ColumnDef } from '@tanstack/react-table';
import { type Database } from '@/lib/database.types';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Invitation = Database['public']['Tables']['invitations']['Row'];

export const columns: ColumnDef<Invitation>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'org_role_ids',
    header: 'Org Roles',
  },
  {
    accessorKey: 'org_roles',
    header: 'Org Roles',
  },
];
