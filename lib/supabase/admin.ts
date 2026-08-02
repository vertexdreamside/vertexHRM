import { createClient } from "@supabase/supabase-js";

// Server-only. Uses the service_role key, which bypasses Row Level
// Security entirely — this file must only ever be imported from Route
// Handlers or Server Actions, never from a Client Component ("use
// client" files can't import it anyway, since SUPABASE_SERVICE_ROLE_KEY
// has no NEXT_PUBLIC_ prefix and isn't bundled to the browser — but
// don't re-export anything from here into client code either).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
