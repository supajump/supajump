'use client';

import { useMembers } from '@/hooks/use-members';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Member } from '@/app/app/[org_id]/members/columns';

export default function MembersTable({ orgId }: { orgId: string }) {
  const { data = [] } = useMembers(orgId);
  return <DataTable columns={columns} data={data as Member[]} />;
}
