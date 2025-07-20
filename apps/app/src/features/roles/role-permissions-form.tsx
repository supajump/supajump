"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form } from "@/components/ui/form"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  useRolePermissions,
  useUpdateRolePermissions,
} from "@/features/roles/hooks/use-role-permissions"
import { cn } from "@/lib/utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Settings2 } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { RolePermissionsSkeleton } from "./role-permissions-skeleton"

// Define action types
type ActionType = "view" | "edit" | "delete" | "create"

// Define available resources and their actions
const PERMISSION_MATRIX = {
  organizations: {
    label: "Organizations",
    actions: ["view", "edit", "delete"] as ActionType[],
    description: "Manage organization settings and details",
  },
  billing: {
    label: "Billing",
    actions: ["view", "edit"] as ActionType[],
    description: "Access and manage billing information",
  },
  members: {
    label: "Members",
    actions: ["view", "edit", "delete"] as ActionType[],
    description: "Manage organization members",
  },
  teams: {
    label: "Teams",
    actions: ["view", "edit", "delete", "create"] as ActionType[],
    description: "Manage teams within the organization",
  },
  team_members: {
    label: "Team Members",
    actions: ["view", "edit", "delete"] as ActionType[],
    description: "Manage team members",
  },
  posts: {
    label: "Posts",
    actions: ["view", "edit", "delete", "create"] as ActionType[],
    description: "Manage posts and content",
  },
} as const

const ACTION_LABELS = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
  create: "Create",
} as const

interface Permission {
  resource: string
  action: string
  scope?: "all" | "own"
  cascade_down?: boolean
  target_kind?: string
}

interface RolePermissionsFormProps {
  roleId: string
  orgId: string
  scope: "organization" | "team"
  teamId: string | null
}

// Zod schema for form validation
const permissionConfigSchema = z.object({
  enabled: z.boolean(),
  scope: z.enum(["all", "own"]),
  cascade_down: z.boolean(),
  target_kind: z.string().optional().default(""),
})

const formSchema = z.object({
  permissions: z.record(z.string(), permissionConfigSchema),
})

type FormData = z.infer<typeof formSchema>

// Component for individual permission checkbox with scope indicator
function PermissionCheckbox({
  resource,
  action,
  checked,
  config,
  onChange,
  onAdvancedChange,
}: {
  resource: string
  action: string
  checked: boolean
  config: {
    enabled: boolean
    scope: "all" | "own"
    cascade_down: boolean
    target_kind?: string
  }
  onChange: (resource: string, action: string, checked: boolean) => void
  onAdvancedChange: (
    resource: string,
    action: string,
    field: "scope" | "cascade_down" | "target_kind",
    value: string | boolean,
  ) => void
}) {
  const handleScopeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (checked) {
      onAdvancedChange(
        resource,
        action,
        "scope",
        config.scope === "all" ? "own" : "all",
      )
    }
  }

  return (
    <div className="relative flex items-center justify-center">
      <Checkbox
        id={`${resource}-${action}`}
        checked={checked}
        onCheckedChange={(checked) => onChange(resource, action, !!checked)}
      />
      {checked && (
        <button
          type="button"
          onClick={handleScopeToggle}
          className={cn(
            "absolute left-[calc(50%+14px)] text-xs px-1.5 py-0.5 rounded-md transition-all duration-200",
            config.scope === "all"
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20",
          )}
          title={
            config.scope === "all"
              ? "Applies to all records"
              : "Applies to own records only"
          }
        >
          {config.scope}
        </button>
      )}
    </div>
  )
}

// Component for advanced options popover
function AdvancedOptionsPopover({
  resource,
  actions,
  permissions,
  scope,
  onAdvancedChange,
}: {
  resource: string
  actions: readonly string[]
  permissions: Record<
    string,
    {
      enabled: boolean
      scope: "all" | "own"
      cascade_down: boolean
      target_kind?: string
    }
  >
  scope: "organization" | "team"
  onAdvancedChange: (
    resource: string,
    action: string,
    field: "scope" | "cascade_down" | "target_kind",
    value: string | boolean,
  ) => void
}) {
  const enabledActions = actions.filter((action) => {
    const key = `${resource}-${action}`
    return permissions[key]?.enabled
  })

  if (enabledActions.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-2">Advanced Options</h4>
            <p className="text-xs text-muted-foreground">
              Configure advanced settings for{" "}
              {
                PERMISSION_MATRIX[resource as keyof typeof PERMISSION_MATRIX]
                  .label
              }{" "}
              permissions
            </p>
          </div>

          {enabledActions.map((action) => {
            const key = `${resource}-${action}`
            const config = permissions[key]

            return (
              <div
                key={action}
                className="space-y-3 pb-3 border-b last:border-0"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    {ACTION_LABELS[action as keyof typeof ACTION_LABELS]}
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Scope</Label>
                  <RadioGroup
                    value={config.scope}
                    onValueChange={(value: string) =>
                      onAdvancedChange(resource, action, "scope", value)
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="all" id={`${key}-all`} />
                      <label
                        htmlFor={`${key}-all`}
                        className="text-sm cursor-pointer"
                      >
                        All records
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="own" id={`${key}-own`} />
                      <label
                        htmlFor={`${key}-own`}
                        className="text-sm cursor-pointer"
                      >
                        Own records only
                      </label>
                    </div>
                  </RadioGroup>
                </div>

                {scope === "organization" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${key}-cascade`} className="text-xs">
                        Cascade to teams
                      </Label>
                      <Switch
                        id={`${key}-cascade`}
                        checked={config.cascade_down}
                        onCheckedChange={(checked) =>
                          onAdvancedChange(
                            resource,
                            action,
                            "cascade_down",
                            checked,
                          )
                        }
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Permission will apply to all teams in the organization
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function RolePermissionsForm({
  roleId,
  orgId,
  scope,
  teamId,
}: RolePermissionsFormProps) {
  const { data: existingPermissions, isLoading } = useRolePermissions(roleId)
  const updatePermissions = useUpdateRolePermissions(roleId)

  // Initialize all possible permissions with defaults, then override with existing
  const initializePermissions = (permissions: Permission[] = []) => {
    const allPermissions: Record<
      string,
      z.infer<typeof permissionConfigSchema>
    > = {}

    // First, add all possible permissions as disabled
    Object.entries(PERMISSION_MATRIX).forEach(([resource, config]) => {
      config.actions.forEach((action) => {
        const key = `${resource}-${action}`
        allPermissions[key] = {
          enabled: false,
          scope: "all",
          cascade_down: false,
          target_kind: "",
        }
      })
    })

    // Then override with existing permissions
    permissions.forEach((perm) => {
      const key = `${perm.resource}-${perm.action}`
      allPermissions[key] = {
        enabled: true,
        scope: perm.scope || "all",
        cascade_down: perm.cascade_down || false,
        target_kind: perm.target_kind || "",
      }
    })

    return allPermissions
  }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      permissions: {},
    },
  })

  // Update form when data loads
  useEffect(() => {
    if (existingPermissions) {
      const initializedPermissions = initializePermissions(
        existingPermissions as Permission[],
      )
      form.reset({
        permissions: initializedPermissions,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPermissions])

  const permissions = form.watch("permissions")

  // Calculate total permissions count
  const totalPermissions = Object.values(permissions).filter(
    (p) => p.enabled,
  ).length

  // Get filtered resources based on scope
  const filteredResources = Object.entries(PERMISSION_MATRIX).filter(
    ([resource]) => {
      if (scope === "team") {
        // For team scope, exclude organization-specific resources
        return !["organizations", "billing"].includes(resource)
      }
      // For organization scope, exclude team-specific resources
      return resource !== "team_members"
    },
  )

  const handlePermissionChange = (
    resource: string,
    action: string,
    checked: boolean,
  ) => {
    const key = `${resource}-${action}`
    const currentValue = form.getValues(`permissions.${key}`)

    form.setValue(`permissions.${key}`, {
      enabled: checked,
      scope: currentValue?.scope || "all",
      cascade_down: currentValue?.cascade_down || false,
      target_kind: currentValue?.target_kind || "",
    })
  }

  const handleAdvancedChange = (
    resource: string,
    action: string,
    field: "scope" | "cascade_down" | "target_kind",
    value: string | boolean,
  ) => {
    const key = `${resource}-${action}`
    const currentValue = form.getValues(`permissions.${key}`)

    if (currentValue) {
      form.setValue(`permissions.${key}`, {
        ...currentValue,
        [field]: value,
      })
    }
  }

  const isPermissionEnabled = (resource: string, action: string) => {
    const key = `${resource}-${action}`
    return permissions[key]?.enabled || false
  }

  const getPermissionConfig = (resource: string, action: string) => {
    const key = `${resource}-${action}`
    return (
      permissions[key] || {
        enabled: false,
        scope: "all",
        cascade_down: false,
        target_kind: "",
      }
    )
  }

  const onSubmit = async (data: FormData) => {
    // Convert permissions object to array format
    const permissionsArray: Array<{
      role_id: string
      org_id: string
      team_id: string | null
      resource: string
      action: string
      scope: "all" | "own"
      cascade_down: boolean
      target_kind: string | null
    }> = []

    Object.entries(data.permissions).forEach(([key, config]) => {
      if (config.enabled) {
        const [resource, action] = key.split("-")
        permissionsArray.push({
          role_id: roleId,
          org_id: orgId,
          team_id: teamId,
          resource,
          action,
          scope: config.scope,
          cascade_down: config.cascade_down,
          target_kind: config.target_kind || null,
        })
      }
    })

    await updatePermissions.mutateAsync(permissionsArray)
  }

  if (isLoading) {
    return <RolePermissionsSkeleton />
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">Role Permissions</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Configure permissions for this role. Click the settings icon to
              set advanced options.
            </p>
          </div>
          {totalPermissions > 0 && (
            <Badge variant="secondary">{totalPermissions} permissions</Badge>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Resource</TableHead>
                {(["view", "create", "edit", "delete"] as ActionType[]).map(
                  (action) => (
                    <TableHead key={action} className="text-center w-[100px]">
                      {ACTION_LABELS[action]}
                    </TableHead>
                  ),
                )}
                <TableHead className="w-[80px] text-center">Options</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map(([resource, config]) => {
                const hasAdvancedOptions = config.actions.some((action) =>
                  isPermissionEnabled(resource, action),
                )

                return (
                  <TableRow key={resource}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {config.description}
                        </div>
                      </div>
                    </TableCell>
                    {(["view", "create", "edit", "delete"] as ActionType[]).map(
                      (action) => (
                        <TableCell key={action} className="text-center">
                          {config.actions.includes(action) ? (
                            <PermissionCheckbox
                              resource={resource}
                              action={action}
                              checked={isPermissionEnabled(resource, action)}
                              config={getPermissionConfig(resource, action)}
                              onChange={handlePermissionChange}
                              onAdvancedChange={handleAdvancedChange}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      ),
                    )}
                    <TableCell className="text-center">
                      {hasAdvancedOptions && (
                        <AdvancedOptionsPopover
                          resource={resource}
                          actions={config.actions}
                          permissions={permissions}
                          scope={scope}
                          onAdvancedChange={handleAdvancedChange}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={
              form.formState.isSubmitting || updatePermissions.isPending
            }
          >
            {form.formState.isSubmitting || updatePermissions.isPending
              ? "Saving..."
              : "Save Permissions"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
