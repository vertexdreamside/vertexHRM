import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// social_auth_providers deliberately has no client-side RLS policy at
// all (see migration 0008) since it holds client_secret in plain text.
// This route is the only way to read or write it — and GET strips the
// secret out of the response before it ever reaches the browser.

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("social_auth_providers")
    .select("id, name, client_id, provider_url")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ providers: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { name, clientId, providerUrl, clientSecret } = body;
  if (!name || !clientId || !providerUrl || !clientSecret) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("social_auth_providers").insert({
    name,
    client_id: clientId,
    provider_url: providerUrl,
    client_secret: clientSecret
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
