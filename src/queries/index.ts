import { posts } from './posts'
import { organizations } from './organizations'

export const api = {
  posts,
  organizations,
} as const

export type Api = typeof api
