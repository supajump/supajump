import { posts } from './posts'
import { organizations } from './organizations'
import { teams } from './teams'
import { members } from './members'
import { roles } from './roles'

export const api = {
  posts,
  organizations,
  teams,
  members,
  roles,
} as const

export type Api = typeof api
