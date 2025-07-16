'use client';

import { ColumnDef } from '@tanstack/react-table';
import { type Database } from '@/lib/database.types';
import Link from 'next/link';

export type Post = Database['public']['Tables']['posts']['Row'];

export const columns: ColumnDef<Post>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => (
      <Link href={`./${row.original.id}`} className='underline'>
        {row.getValue('title') as string}
      </Link>
    ),
  },
  {
    accessorKey: 'post_status',
    header: 'Status',
  },
  {
    accessorKey: 'post_type',
    header: 'Type',
  },
  {
    accessorKey: 'created_at',
    header: 'Created',
    cell: ({ row }) =>
      new Date(row.getValue('created_at') as string).toLocaleDateString(),
  },
];
