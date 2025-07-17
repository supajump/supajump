"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Label } from "@/components/ui/label"

// Define available resources and their actions
const PERMISSION_MATRIX = {
  organizations: {
    label: "Organizations",
    actions: ["view", "edit", "delete", "manage"],
    description: "Manage organization settings and details",
  },
  billing: {
    label: "Billing",
    actions: ["view", "edit", "manage"],
    description: "Access and manage billing information",
  },
  members: {
    label: "Members",
    actions: ["view", "edit", "delete", "invite"],
    description: "Manage organization members",
  },
  teams: {
    label: "Teams",
    actions: ["view", "edit", "delete", "create", "manage"],
    description: "Manage teams within the organization",
  },
  team_members: {
    label: "Team Members",
    actions: ["view", "edit", "delete", "invite"],
    description: "Manage team members",
  },
  posts: {
    label: "Posts",
    actions: ["view", "edit", "delete", "create"],
    description: "Manage posts and content",
  },
} as const

const ACTION_LABELS = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
  create: "Create",
  manage: "Manage",
  invite: "Invite",
} as const

interface Permission {
  resource: string
  action: string
}

interface RolePermissionsFormProps {
  roleId: string
  orgId: string
  scope: "organization" | "team"
  teamId: string | null
  existingPermissions: Permission[]
}

export function RolePermissionsForm({
  roleId,
  orgId,
  scope,
  teamId,
  existingPermissions,
}: RolePermissionsFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Convert existing permissions to a Record format for easier access
  const initialPermissions = existingPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = []
    }
    acc[perm.resource].push(perm.action)
    return acc
  }, {} as Record<string, string[]>)

  const [permissions, setPermissions] = useState<Record<string, string[]>>(initialPermissions)

  // Calculate total permissions count
  const totalPermissions = Object.values(permissions).reduce(
    (acc, actions) => acc + actions.length,
    0
  )

  // Get filtered resources based on scope
  const filteredResources = Object.entries(PERMISSION_MATRIX).filter(([resource]) => {
    if (scope === "team") {
      // For team scope, exclude organization-specific resources
      return !["organizations", "billing"].includes(resource)
    }
    // For organization scope, exclude team-specific resources
    return resource !== "team_members"
  })

  const handlePermissionChange = (resource: string, action: string, checked: boolean) => {
    const newPermissions = { ...permissions }
    
    if (!newPermissions[resource]) {
      newPermissions[resource] = []
    }
    
    if (checked) {
      if (!newPermissions[resource].includes(action)) {
        newPermissions[resource] = [...newPermissions[resource], action]
      }
    } else {
      newPermissions[resource] = newPermissions[resource].filter((a) => a !== action)
      if (newPermissions[resource].length === 0) {
        delete newPermissions[resource]
      }
    }
    
    setPermissions(newPermissions)
  }

  const handleSelectAll = (resource: string, checked: boolean) => {
    const config = PERMISSION_MATRIX[resource as keyof typeof PERMISSION_MATRIX]
    const newPermissions = { ...permissions }
    
    if (checked) {
      newPermissions[resource] = [...config.actions]
    } else {
      delete newPermissions[resource]
    }
    
    setPermissions(newPermissions)
  }

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First, delete all existing permissions for this role
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)

      if (deleteError) throw deleteError

      // Convert permissions object to array format
      const permissionsArray: any[] = []
      Object.entries(permissions).forEach(([resource, actions]) => {
        actions.forEach((action) => {
          permissionsArray.push({
            role_id: roleId,
            org_id: orgId,
            team_id: teamId,
            resource,
            action,
          })
        })
      })

      // Insert new permissions
      if (permissionsArray.length > 0) {
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(permissionsArray)

        if (insertError) throw insertError
      }

      // Redirect back to roles list
      router.push(`/app/${orgId}/roles`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to update permissions")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label>Role Permissions</Label>
        {totalPermissions > 0 && (
          <Badge variant="secondary">{totalPermissions} selected</Badge>
        )}
      </div>

      <Accordion type="multiple" className="w-full" defaultValue={Object.keys(initialPermissions)}>
        {filteredResources.map(([resource, config]) => {
          const selectedActions = permissions[resource] || []
          const allSelected = selectedActions.length === config.actions.length

          return (
            <AccordionItem key={resource} value={resource}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between flex-1 pr-4">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{config.label}</span>
                    <span className="text-sm text-muted-foreground">
                      {config.description}
                    </span>
                  </div>
                  {selectedActions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedActions.length} / {config.actions.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-3 pb-3 border-b">
                    <Checkbox
                      id={`${resource}-all`}
                      checked={allSelected}
                      onCheckedChange={(checked) => handleSelectAll(resource, !!checked)}
                    />
                    <label
                      htmlFor={`${resource}-all`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Select all
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {config.actions.map((action) => (
                      <div key={`${resource}-${action}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${resource}-${action}`}
                          checked={selectedActions.includes(action)}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(resource, action, !!checked)
                          }
                        />
                        <label
                          htmlFor={`${resource}-${action}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Permissions"}
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/app/${orgId}/roles`)}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}