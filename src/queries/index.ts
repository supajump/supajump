import { posts } from './posts'
import { organizations } from './organizations'
import { teams } from './teams'

export const api = {
  posts,
  organizations,
  teams,
} as const

export type Api = typeof api
