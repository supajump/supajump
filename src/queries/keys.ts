export const postsKeys = {
  all: () => ['posts'] as const,
  list: (orgId: string, teamId: string) => ['posts', orgId, teamId] as const,
  detail: (postId: string) => ['post', postId] as const,
} as const;

export const organizationsKeys = {
  all: () => ['organizations'] as const,
  detail: (orgId: string) => ['organization', orgId] as const,
} as const;
