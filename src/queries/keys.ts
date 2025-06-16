export const postsKeys = {
  all: () => ['posts'] as const,
  list: (orgId: string, teamId: string) => ['posts', orgId, teamId] as const,
  detail: (postId: string) => ['post', postId] as const,
} as const;

export const organizationsKeys = {
  all: () => ['organizations'] as const,
  detail: (orgId: string) => ['organization', orgId] as const,
  allWithTeams: () => ['organizations', 'withTeams'] as const,
} as const;

export const teamsKeys = {
  all: () => ['teams'] as const,
  list: (orgId: string) => ['teams', orgId] as const,
  detail: (teamId: string) => ['team', teamId] as const,
} as const;
