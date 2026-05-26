import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { env } from "../../../env.mjs"

/**
 * Service-role Supabase client for server-only operations (upload tokens, webhooks).
 * Bypasses RLS — never import from client components.
 */
export function createServiceClient() {
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE
  )
}
