"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"
import { Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"

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

// Get all unique actions across all resources
const ALL_ACTIONS = Array.from(
  new Set(Object.values(PERMISSION_MATRIX).flatMap((config) => config.actions)),
)

interface Permission {
  resource: string
  action: string
  scope: string
  cascade_down: boolean
  target_kind: string | null
}

interface PermissionFormData {
  enabled: boolean
  scope: string
  cascade_down: boolean
  target_kind: string
}

type FormValues = Record<string, Record<string, PermissionFormData>>

interface RolePermissionsFormProps {
  roleId: string
  orgId: string
  scope: "organization" | "team"
  teamId: string | null
  existingPermissions: Permission[]
}

interface PermissionCellProps {
  resource: string
  action: string
  hasAction: boolean
  formScope: "organization" | "team"
}

function PermissionCell({
  resource,
  action,
  hasAction,
  formScope,
}: PermissionCellProps) {
  // Watch the enabled state for this permission
  const isEnabled = useWatch({
    name: `${resource}.${action}.enabled`,
    defaultValue: false,
  })

  if (!hasAction) {
    return (
      <TableCell className="text-center text-muted-foreground">-</TableCell>
    )
  }

  return (
    <TableCell className="text-center">
      <div className="flex items-center justify-center gap-2">
        <FormField
          name={`${resource}.${action}.enabled`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Always show Scope Select */}
        <FormField
          name={`${resource}.${action}.scope`}
          render={({ field }) => (
            <FormItem className="w-20">
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!isEnabled}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="own">Own</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />

        {/* Always show Advanced Options Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              disabled={!isEnabled}
            >
              <Settings className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Advanced Options for{" "}
                {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}{" "}
                {
                  PERMISSION_MATRIX[resource as keyof typeof PERMISSION_MATRIX]
                    .label
                }
              </Label>
            </div>

            {formScope === "organization" && (
              <FormField
                name={`${resource}.${action}.cascade_down`}
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Cascade Down</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Apply this permission to child teams
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <FormField
              name={`${resource}.${action}.target_kind`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Kind</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., teams, posts"
                      className="h-8"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Specify the type of resource this permission applies to
                  </p>
                </FormItem>
              )}
            />
          </PopoverContent>
        </Popover>
      </div>
    </TableCell>
  )
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

  // Convert existing permissions to form format
  const defaultValues = existingPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = {}
    }
    acc[perm.resource][perm.action] = {
      enabled: true,
      scope: perm.scope,
      cascade_down: perm.cascade_down,
      target_kind: perm.target_kind || "",
    }
    return acc
  }, {} as FormValues)

  // Fill in default values for all resources/actions
  const filteredResources = Object.entries(PERMISSION_MATRIX).filter(
    ([resource]) => {
      if (scope === "team") {
        return !["organizations", "billing"].includes(resource)
      }
      return resource !== "team_members"
    },
  )

  // Initialize form with complete default values
  const completeDefaultValues = filteredResources.reduce(
    (acc, [resource, config]) => {
      acc[resource] = {}
      config.actions.forEach((action) => {
        acc[resource][action] = defaultValues[resource]?.[action] || {
          enabled: false,
          scope: "all",
          cascade_down: false,
          target_kind: "",
        }
      })
      return acc
    },
    {} as FormValues,
  )

  const form = useForm<FormValues>({
    defaultValues: completeDefaultValues,
  })

  // Watch all form values to calculate total permissions
  const watchedValues = useWatch({ control: form.control })
  const totalPermissions = Object.values(watchedValues || {}).reduce(
    (acc, resourcePerms) =>
      acc +
      Object.values(resourcePerms || {}).filter((perm) => perm && perm.enabled)
        .length,
    0,
  )

  const handleSave = async (data: FormValues) => {
    setIsLoading(true)
    setError(null)

    try {
      // Delete existing permissions
      const { error: deleteError } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role_id", roleId)

      if (deleteError) throw deleteError

      // Convert form data to permissions array
      const permissionsArray: {
        role_id: string
        org_id: string
        team_id: string | null
        resource: string
        action: string
        scope: string
        cascade_down: boolean
        target_kind: string | null
      }[] = []

      Object.entries(data).forEach(([resource, actions]) => {
        Object.entries(actions).forEach(([action, permState]) => {
          if (permState.enabled) {
            permissionsArray.push({
              role_id: roleId,
              org_id: orgId,
              team_id: teamId,
              resource,
              action,
              scope: permState.scope,
              cascade_down: permState.cascade_down,
              target_kind: permState.target_kind || null,
            })
          }
        })
      })

      // Insert new permissions
      if (permissionsArray.length > 0) {
        const { error: insertError } = await supabase
          .from("role_permissions")
          .insert(permissionsArray)

        if (insertError) throw insertError
      }

      router.push(`/app/${orgId}/roles`)
      router.refresh()
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update permissions"
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        <div className="flex items-center justify-between">
          <Label>Role Permissions</Label>
          {totalPermissions > 0 && (
            <Badge variant="secondary">{totalPermissions} selected</Badge>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                {ALL_ACTIONS.map((action) => (
                  <TableHead key={action} className="text-center">
                    {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map(([resource, config]) => (
                <TableRow key={resource}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{config.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {config.description}
                      </div>
                    </div>
                  </TableCell>
                  {ALL_ACTIONS.map((action) => (
                    <PermissionCell
                      key={`${resource}-${action}`}
                      resource={resource}
                      action={action}
                      hasAction={(config.actions as readonly string[]).includes(
                        action,
                      )}
                      formScope={scope}
                    />
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Permissions"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/app/${orgId}/roles`)}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
