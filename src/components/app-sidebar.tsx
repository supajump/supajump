'use client';

import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { NavTeams } from '@/components/nav-teams';
import { NavUser } from '@/components/nav-user';
import { OrgTeamSwitcher } from '@/components/org-team-switcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useNavMain, useNavTeams } from '@/lib/menu-list';
import { useParams } from 'next/navigation';
import {
  Frame,
  Map,
  PieChart,
  Settings2,
  BookOpen,
  Bot,
  SquareTerminal,
  Command,
  AudioWaveform,
  GalleryVerticalEnd,
} from 'lucide-react';

export function AppSidebar({
  org_id,
  ...props
}: {
  org_id: string;
  props: React.ComponentProps<typeof Sidebar>;
}) {
  const { team_id } = useParams<{ team_id?: string }>();
  const navMain = useNavMain({
    org_id,
    team_id: team_id,
  });
  const navTeams = useNavTeams({ org_id });

  // This is sample data.
  const data = {
    user: {
      name: 'shadcn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg',
    },
    organizations: [
      {
        id: 'org_1',
        name: 'Acme Holdings',
        logo: Frame,
        plan: 'Enterprise',
      },
      {
        id: 'org_2',
        name: 'Globex Corp.',
        logo: Map,
        plan: 'Startup',
      },
      {
        id: 'org_3',
        name: 'Umbrella',
        logo: PieChart,
        plan: 'Free',
      },
    ],
    teams: [
      {
        id: 'team_1',
        name: 'Acme Inc',
        logo: GalleryVerticalEnd,
        plan: 'Enterprise',
      },
      {
        id: 'team_2',
        name: 'Acme Corp.',
        logo: AudioWaveform,
        plan: 'Startup',
      },
      {
        id: 'team_3',
        name: 'Evil Corp.',
        logo: Command,
        plan: 'Free',
      },
    ],
    navMain: [
      {
        title: 'Playground',
        url: '#',
        icon: SquareTerminal,
        isActive: true,
        items: [
          {
            title: 'History',
            url: '#',
          },
          {
            title: 'Starred',
            url: '#',
          },
          {
            title: 'Settings',
            url: '#',
          },
        ],
      },
      {
        title: 'Models',
        url: '#',
        icon: Bot,
        items: [
          {
            title: 'Genesis',
            url: '#',
          },
          {
            title: 'Explorer',
            url: '#',
          },
          {
            title: 'Quantum',
            url: '#',
          },
        ],
      },
      {
        title: 'Documentation',
        url: '#',
        icon: BookOpen,
        items: [
          {
            title: 'Introduction',
            url: '#',
          },
          {
            title: 'Get Started',
            url: '#',
          },
          {
            title: 'Tutorials',
            url: '#',
          },
          {
            title: 'Changelog',
            url: '#',
          },
        ],
      },
      {
        title: 'Settings',
        url: '#',
        icon: Settings2,
        items: [
          {
            title: 'General',
            url: '#',
          },
          {
            title: 'Team',
            url: '#',
          },
          {
            title: 'Billing',
            url: '#',
          },
          {
            title: 'Limits',
            url: '#',
          },
        ],
      },
    ],
    projects: [
      {
        name: 'Design Engineering',
        url: '#',
        icon: Frame,
      },
      {
        name: 'Sales & Marketing',
        url: '#',
        icon: PieChart,
      },
      {
        name: 'Travel',
        url: '#',
        icon: Map,
      },
    ],
  };

  return (
    <Sidebar collapsible='icon' {...props}>
      <SidebarHeader className='flex-row gap-2'>
          <OrgTeamSwitcher currentOrgId={org_id} currentTeamId={team_id ?? ''} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavTeams teams={navTeams} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
