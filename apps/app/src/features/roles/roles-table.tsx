'use client';

import { useRoles } from '@/hooks/use-roles';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Role } from '@/features/roles/columns';

export default function RolesTable({ orgId }: { orgId: string }) {
  const { data = [] } = useRoles(orgId);
  return <DataTable columns={columns} data={data as Role[]} />;
}
