import { type Database } from '@/lib/database.types'
import { type SupabaseClient } from '@supabase/supabase-js'

export type Invitation = Database['public']['Tables']['invitations']['Row']

async function getAll(supabase: SupabaseClient<Database>, orgId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select('*')
    .eq('org_id', orgId)
  if (error) throw new Error(error.message)
  return data
}

export const invitations = {
  getAll,
} as const