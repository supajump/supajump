import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RolePermissionsForm } from "@/features/roles/role-permissions-form"
import { createClient } from "@/lib/supabase/server"
import { api } from "@/queries"
import { rolesKeys } from "@/queries/keys"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { HydrationBoundary, dehydrate } from "@tanstack/react-query"
import { getQueryClient } from "@/components/providers/get-query-client"

interface PageProps {
  params: Promise<{
    org_id: string
    role_id: string
  }>
}

export default async function EditRolePage({ params }: PageProps) {
  const { org_id, role_id } = await params
  const supabase = await createClient()

  const role = await api.roles.findUnique(supabase, role_id)

  if (!role) {
    notFound()
  }

  // Get teams for team-scoped roles
  const teams = await api.teams.getAll(supabase, org_id)

  // Prefetch permissions data
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: rolesKeys.permissions(role_id),
    queryFn: () => api.roles.getPermissions(supabase, role_id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/app/${org_id}/roles`}>
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Roles
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Role: {role.display_name || role.name}</CardTitle>
          <CardDescription>
            {role.description || "Manage permissions for this role"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Scope:
              </span>
              <span className="ml-2 text-sm capitalize">{role.scope}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-muted-foreground">
                Name:
              </span>
              <span className="ml-2 text-sm">{role.name}</span>
            </div>
            {role.scope === "team" && role.team_id && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">
                  Team:
                </span>
                <span className="ml-2 text-sm">
                  {teams.find((t) => t.id === role.team_id)?.name ||
                    role.team_id}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Select the permissions this role should have
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RolePermissionsForm
            roleId={role_id}
            orgId={org_id}
            scope={role.scope as "organization" | "team"}
            teamId={role.team_id}
          />
        </CardContent>
      </Card>
    </div>
    </HydrationBoundary>
  )
}
