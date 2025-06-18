import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getRoles(
  supabase: SupabaseClient<Database>,
  orgId: string,
) {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
  return data;
}

export const roles = {
  getAll: getRoles,
} as const;
