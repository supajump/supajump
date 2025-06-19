import { posts } from './posts'
import { organizations } from './organizations'
import { teams } from './teams'
import { members } from './members'
import { roles } from './roles'
import { profiles } from './profiles'
import { invitations } from './invitations'

export const api = {
  posts,
  organizations,
  teams,
  members,
  roles,
  profiles,
  invitations,
} as const

export type Api = typeof api
