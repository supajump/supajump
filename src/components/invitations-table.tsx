'use client';

import { useInvitations } from '@/hooks/use-invitations';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type Invitation } from '@/app/app/[org_id]/invitations/columns';

export function InvitationsTable({ orgId }: { orgId: string }) {
  const { data = [] } = useInvitations(orgId);
  return <DataTable columns={columns} data={data as Invitation[]} />;
}
