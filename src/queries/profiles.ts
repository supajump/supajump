import type { Database } from '@/lib/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getById(supabase: SupabaseClient<Database>, id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const profiles = {
  getById,
} as const

