'use client';

import * as React from 'react';
import { ChevronsUpDown } from 'lucide-react';

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
import { useParams, usePathname, useRouter } from 'next/navigation';

export function OrgTeamSwitcher({
  orgs,
  teams,
}: {
  orgs: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
  teams: {
    id: string;
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}) {
  const { org_id, team_id } = useParams<{
    org_id?: string;
    team_id?: string;
  }>();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);

  const [activeOrg, setActiveOrg] = React.useState(
    orgs.find((o) => o.id === org_id) ?? orgs[0]
  );
  const [activeTeam, setActiveTeam] = React.useState(
    teams.find((t) => t.id === team_id) ?? teams[0]
  );

  React.useEffect(() => {
    const newOrg = orgs.find((o) => o.id === org_id);
    if (newOrg) {
      setActiveOrg(newOrg);
    }
  }, [org_id, orgs]);

  React.useEffect(() => {
    const newTeam = teams.find((t) => t.id === team_id);
    if (newTeam) {
      setActiveTeam(newTeam);
    }
  }, [team_id, teams]);

  const handleOrgSelect = (org: (typeof orgs)[number]) => {
    setActiveOrg(org);
    setOpen(false);
    if (!org_id) return;
    if (pathname.includes(`/${org_id}/`)) {
      router.push(pathname.replace(`/${org_id}/`, `/${org.id}/`));
    } else if (pathname.endsWith(`/${org_id}`)) {
      router.push(pathname.replace(`/${org_id}`, `/${org.id}`));
    } else if (team_id) {
      router.push(`/app/${org.id}/${team_id}/dashboard`);
    } else {
      router.push(`/app/${org.id}`);
    }
  };

  const handleTeamSelect = (team: (typeof teams)[number]) => {
    setActiveTeam(team);
    setOpen(false);
    if (!org_id) return;
    if (pathname.includes(`/${team_id}/`)) {
      router.push(pathname.replace(`/${team_id}/`, `/${team.id}/`));
    } else if (pathname.endsWith(`/${team_id}`)) {
      router.push(pathname.replace(`/${team_id}`, `/${team.id}`));
    } else {
      router.push(`/app/${org_id}/${team.id}/dashboard`);
    }
  };

  if (!activeOrg || !activeTeam) {
    return null;
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
              <activeTeam.logo className='size-4' />
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
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading='Organizations'>
            {orgs.map((org) => (
              <CommandItem key={org.id} onSelect={() => handleOrgSelect(org)}>
                <org.logo className='mr-2 size-4' />
                {org.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading='Teams'>
            {teams.map((team) => (
              <CommandItem
                key={team.id}
                onSelect={() => handleTeamSelect(team)}
              >
                <team.logo className='mr-2 size-4' />
                {team.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
