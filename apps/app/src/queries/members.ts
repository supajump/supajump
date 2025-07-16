import type { Database } from '@/lib/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

async function getMembers(
  supabase: SupabaseClient<Database>,
  orgId: string,
) {
  const { data, error } = await supabase
    .from('org_memberships')
    .select('*, profiles!org_memberships_profiles_fkey(*)')
    .eq('org_id', orgId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((m) => m.profiles);
}

export const members = {
  getAll: getMembers,
} as const;
