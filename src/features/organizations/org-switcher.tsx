"use client"

import * as React from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useParams, usePathname, useRouter } from "next/navigation"

export function OrgSwitcher({
  orgs,
}: {
  orgs: {
    id: string
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const { org_id, team_id } = useParams<{ org_id?: string; team_id?: string }>()
  const pathname = usePathname()
  const router = useRouter()

  const [activeOrg, setActiveOrg] = React.useState(
    orgs.find((o) => o.id === org_id) ?? orgs[0]
  )

  React.useEffect(() => {
    const newOrg = orgs.find((o) => o.id === org_id)
    if (newOrg) {
      setActiveOrg(newOrg)
    }
  }, [org_id, orgs])

  const handleSelect = (org: (typeof orgs)[number]) => {
    setActiveOrg(org)
    if (!org_id) return
    if (pathname.includes(`/${org_id}/`)) {
      router.push(pathname.replace(`/${org_id}/`, `/${org.id}/`))
    } else if (pathname.endsWith(`/${org_id}`)) {
      router.push(pathname.replace(`/${org_id}`, `/${org.id}`))
    } else if (team_id) {
      router.push(`/app/${org.id}/${team_id}/dashboard`)
    } else {
      router.push(`/app/${org.id}`)
    }
  }

  if (!activeOrg) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <activeOrg.logo className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeOrg.name}</span>
                <span className="truncate text-xs">{activeOrg.plan}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Organizations
            </DropdownMenuLabel>
            {orgs.map((org, index) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => handleSelect(org)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <org.logo className="size-3.5 shrink-0" />
                </div>
                {org.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add organization</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
