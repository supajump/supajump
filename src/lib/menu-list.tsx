import { useMemo } from 'react';
// This is sample data.
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Bot,
  Frame,
  FileTextIcon,
  type LucideIcon,
  Map,
  PieChart,
  Settings2,
  SquareTerminal,
} from 'lucide-react';

type Submenu = {
  href: string;
  label: string;
  active: boolean;
};

type Menu = {
  href: string;
  label: string;
  active: boolean;
  icon: LucideIcon;
  submenus: Submenu[];
};

type Group = {
  groupLabel: string;
  menus: Menu[];
};

export function useNavMain({
  org_id,
  team_id,
}: {
  org_id?: string;
  team_id?: string | null;
}) {
  const pathname = usePathname();

  return useMemo(
    () => [
      {
        title: 'Posts',
        url: '#',
        icon: FileTextIcon,
        isActive:
          pathname?.includes(
            `/app/${org_id}${team_id ? `/${team_id}` : ''}/posts`
          ) || pathname?.includes(`/app/${org_id}/posts`),
        items: [
          {
            title: 'All Posts',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/posts`,
          },
          {
            title: 'New Post',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/posts/new`,
          },
          {
            title: 'Post Settings',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/posts/settings`,
          },
        ],
      },
      {
        title: 'Chat',
        url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/chat`,
        icon: Bot,
        isActive: pathname?.includes(
          `/app/${org_id}${team_id ? `/${team_id}` : ''}/chat`
        ),
        items: [
          {
            title: 'New Chat',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/chat`,
          },
          {
            title: 'History',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/chat/history`,
          },
          {
            title: 'Settings',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/chat/settings`,
          },
        ],
      },
      {
        title: 'Inventory',
        url: '#',
        icon: BookOpen,
        isActive: pathname?.includes(
          `/app/${org_id}${team_id ? `/${team_id}` : ''}/inventory`
        ),
        items: [
          {
            title: 'Vehicles',
            url: `/app/${org_id}${
              team_id ? `/${team_id}` : ''
            }/inventory/vehicles`,
            isActive: pathname?.includes(
              `/app/${org_id}${team_id ? `/${team_id}` : ''}/inventory/vehicles`
            ),
          },
          {
            title: 'Imports',
            url: `/app/${org_id}${
              team_id ? `/${team_id}` : ''
            }/inventory/imports`,
            isActive: pathname?.includes(
              `/app/${org_id}${team_id ? `/${team_id}` : ''}/inventory/imports`
            ),
          },
          {
            title: 'Feeds',
            url: `/app/${org_id}${
              team_id ? `/${team_id}` : ''
            }/inventory/feeds`,
            isActive: pathname?.includes(
              `/app/${org_id}${team_id ? `/${team_id}` : ''}/inventory/feeds`
            ),
          },
          {
            title: 'Changelog',
            url: `/app/${org_id}${
              team_id ? `/${team_id}` : ''
            }/inventory/changelog`,
            isActive: pathname?.includes(
              `/app/${org_id}${
                team_id ? `/${team_id}` : ''
              }/inventory/changelog`
            ),
          },
        ],
      },
      {
        title: 'Settings',
        url: '#',
        icon: Settings2,
        isActive: pathname?.includes(
          `/app/${org_id}${team_id ? `/${team_id}` : ''}/settings`
        ),
        items: [
          {
            title: 'General',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/settings`,
            isActive: pathname?.includes(
              `/app/${org_id}${team_id ? `/${team_id}` : ''}/settings`
            ),
          },
          {
            title: 'Team',
            url: `/app/${org_id}${team_id ? `/${team_id}` : ''}/settings/team`,
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
    [pathname, org_id, team_id]
  );
}

export function useNavTeams({ org_id }: { org_id?: string }) {
  return useMemo(
    () => [
      {
        name: 'Teams',
        url: `/app/${org_id}/teams`,
        icon: Frame,
      },
      {
        name: 'Members',
        url: `/app/${org_id}/members`,
        icon: PieChart,
      },
      {
        name: 'Org Settings',
        url: `/app/${org_id}/settings`,
        icon: Map,
      },
    ],
    [org_id] // pathname not needed in deps since it's not used in the computed values
  );
}

export function getMenuList(
  pathname: string,
  org_id?: string,
  pid?: string
): Group[] {
  return [
    {
      groupLabel: '',
      menus: [
        {
          href: `/app/${org_id}/${pid}`,
          label: 'team Dashboard',
          active: pathname === `/app/${org_id}`,
          icon: SquareTerminal,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: 'Contents',
      menus: [
        // {
        //   href: `/app/${org_id}/${pid}/posts`,
        //   label: "Posts",
        //   active: pathname.includes(`/app/${org_id}/${pid}/posts`),
        //   icon: "squarePen",
        //   submenus: [
        //     {
        //       href: `/app/${org_id}/${pid}/posts`,
        //       label: "All Posts",
        //       active: pathname === `/app/${org_id}/${pid}/posts`,
        //     },
        //     {
        //       href: "/posts/new",
        //       label: "New Post",
        //       active: pathname === "/posts/new",
        //     },
        //   ],
        // },
        {
          href: `/app/${org_id}/${pid}/popups`,
          label: 'Popups',
          active: pathname.includes(`/app/${org_id}/${pid}/popups`),
          icon: SquareTerminal,
          submenus: [],
        },
        {
          href: `/app/${org_id}/${pid}/action-buttons`,
          label: 'Action Buttons',
          active: pathname.includes(`/app/${org_id}/${pid}/action-buttons`),
          icon: SquareTerminal,
          submenus: [],
        },
        {
          href: `/app/${org_id}/${pid}/chat`,
          label: 'Chat',
          active: pathname.includes(`/app/${org_id}/${pid}/chat`),
          icon: SquareTerminal,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: 'Inventory',
      menus: [
        {
          href: `/app/${org_id}/${pid}/vehicles`,
          label: 'Vehicles',
          active: pathname.includes(`/app/${org_id}/${pid}/vehicles`),
          icon: SquareTerminal,
          submenus: [],
        },
        {
          href: `/app/${org_id}/${pid}/imports`,
          label: 'Imports',
          active: pathname.includes(`/app/${org_id}/${pid}/imports`),
          icon: SquareTerminal,
          submenus: [],
        },
      ],
    },
    {
      groupLabel: 'Settings',
      menus: [
        {
          href: `/app/${org_id}/members`,
          label: 'Team Members',
          active: pathname.includes(`/app/${org_id}/members`),
          icon: SquareTerminal,
          submenus: [],
        },
        {
          href: `/app/${org_id}/${pid}/settings`,
          label: 'team Settings',
          active: pathname.includes(`/app/${org_id}/${pid}/settings`),
          icon: SquareTerminal,
          submenus: [],
        },
      ],
    },
  ];
}
