import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { api } from "@/queries"

export default async function OrgPostsPage({
  params,
}: {
  params: Promise<{ org_id: string }>
}) {
  const { org_id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const teams = await api.teams.getAll(supabase, org_id)

  if (!teams?.length) {
    redirect(`/app/${org_id}`)
  }

  redirect(`/app/${org_id}/${teams[0].id}/posts`)
}
