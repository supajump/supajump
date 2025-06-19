import { posts } from './posts'
import { organizations } from './organizations'
import { teams } from './teams'
import { members } from './members'
import { roles } from './roles'
import { profiles } from './profiles'

export const api = {
  posts,
  organizations,
  teams,
  members,
  roles,
  profiles,
} as const

export type Api = typeof api
