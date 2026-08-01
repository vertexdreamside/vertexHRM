import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components. Reads the public anon key only —
// Row Level Security in Postgres is what actually enforces access,
// not this client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
