import type { Database } from '@/lib/database.types'

export const entities = {
  posts: {
    table: 'posts',
    rowType: {} as Database['public']['Tables']['posts']['Row'],
    insertType: {} as Database['public']['Tables']['posts']['Insert'],
    updateType: {} as Database['public']['Tables']['posts']['Update'],
    joins: {
      organization: { select: 'organizations(id,name)' },
      team: { select: 'teams(id,name)' }
    }
  },
  organizations: {
    table: 'organizations',
    rowType: {} as Database['public']['Tables']['organizations']['Row'],
    insertType: {} as Database['public']['Tables']['organizations']['Insert'],
    updateType: {} as Database['public']['Tables']['organizations']['Update'],
    joins: {}
  },
  teams: {
    table: 'teams',
    rowType: {} as Database['public']['Tables']['teams']['Row'],
    insertType: {} as Database['public']['Tables']['teams']['Insert'],
    updateType: {} as Database['public']['Tables']['teams']['Update'],
    joins: {
      organization: { select: 'organizations(id,name)' }
    }
  },
  // ...more entities
} as const
