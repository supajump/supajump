'use client';

import * as React from 'react';
import { ChevronsUpDown, Plus } from 'lucide-react';

import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import CreateTeamDialog from './create-team-dialog';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganizationsWithTeams } from '@/hooks/use-organization';
import { cn } from '@/lib/utils';

export function OrgTeamSwitcher({ currentOrgId, currentTeamId }: { currentOrgId: string; currentTeamId: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);

  const { data: organizationsWithTeams = [] } = useOrganizationsWithTeams();

  const [activeOrg, setActiveOrg] = React.useState<typeof organizationsWithTeams[number] | undefined>(undefined);
  const [activeTeam, setActiveTeam] = React.useState<typeof organizationsWithTeams[number]['teams'][number] | undefined>(undefined);

  // Initialize and sync activeOrg when organizationsWithTeams or currentOrgId changes
  React.useEffect(() => {
    const newOrg = organizationsWithTeams.find((o) => o.id === currentOrgId);
    if (newOrg) {
      setActiveOrg(newOrg);
    } else if (organizationsWithTeams.length > 0 && !newOrg) {
      // Fallback to first org if current org not found
      setActiveOrg(organizationsWithTeams[0]);
    }
  }, [currentOrgId, organizationsWithTeams]);

  // Initialize and sync activeTeam when activeOrg or currentTeamId changes
  React.useEffect(() => {
    if (activeOrg) {
      const newTeam = activeOrg.teams.find((t) => t.id === currentTeamId);
      if (newTeam) {
        setActiveTeam(newTeam);
      } else if (activeOrg.teams.length > 0) {
        // Fallback to first team if current team not found
        setActiveTeam(activeOrg.teams[0]);
      }
    }
  }, [currentTeamId, activeOrg]);

  const handleOrgSelect = (org: (typeof organizationsWithTeams)[number]) => {
    setActiveOrg(org);
    setOpen(false);
    if (!currentOrgId) return;
    router.push(`/app/${org.id}`);
  };

  const handleTeamSelect = (team: NonNullable<typeof activeOrg>['teams'][number]) => {
    setActiveTeam(team);
    setOpen(false);
    if (!currentOrgId) return;
    if (pathname.includes(`/${currentTeamId}/`)) {
      router.push(pathname.replace(`/${currentTeamId}/`, `/${team.id}/`));
    } else if (pathname.endsWith(`/${currentTeamId}`)) {
      router.push(pathname.replace(`/${currentTeamId}`, `/${team.id}`));
    } else {
      router.push(`/app/${currentOrgId}/${team.id}/dashboard`);
    }
  };

  // Show loading state while data is being fetched or states are being initialized
  if (!activeOrg || !activeTeam || organizationsWithTeams.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size='lg' disabled>
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
              {/* Loading placeholder */}
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>Loading...</span>
              <span className='truncate text-xs'>Please wait</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size='lg'
            onClick={() => setOpen(true)}
            data-state={open ? 'open' : 'closed'}
            className='data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground'
          >
            <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
              {/* <activeTeam.logo className='size-4' /> */}
            </div>
            <div className='grid flex-1 text-left text-sm leading-tight'>
              <span className='truncate font-medium'>{activeOrg.name}</span>
              <span className='truncate text-xs'>{activeTeam.name}</span>
            </div>
            <ChevronsUpDown className='ml-auto size-4' />
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder='Search organizations or teams...' />
        <CommandList className='grid grid-cols-2 divide-x'>
          <CommandEmpty>No results found.</CommandEmpty>
          <div>
            <CommandGroup heading='Organizations'>
              {organizationsWithTeams.map((org) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => handleOrgSelect(org)}
                  className={cn(org.id === activeOrg.id && 'bg-accent text-accent-foreground')}
                >
                  {org.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
          <div>
            <CommandGroup heading='Teams'>
              {activeOrg.teams.map((team) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => handleTeamSelect(team)}
                  className={cn(team.id === activeTeam.id && 'bg-accent text-accent-foreground')}
                >
                  {team.name}
                </CommandItem>
              ))}
              <CommandSeparator />
              <CommandItem onSelect={() => { setOpen(false); setCreateOpen(true) }}>
                <Plus className='mr-2 size-4' /> Create Team
              </CommandItem>
            </CommandGroup>
          </div>
        </CommandList>
      </CommandDialog>
      <CreateTeamDialog orgId={activeOrg.id} open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
