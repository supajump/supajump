import { redirect } from 'next/navigation';

export default async function PostSettingsPage({
  params,
}: {
  params: Promise<{ org_id: string; team_id: string }>;
}) {
  const { org_id, team_id } = await params;
  redirect(`/app/${org_id}/${team_id}/settings/team`);
}
