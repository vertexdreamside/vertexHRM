import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleMessage, type PendingAction } from "@/lib/assistant/intents";

// No LLM, no API key, no external cost — every reply comes from
// matching the message text against a small set of patterns, then a
// real Supabase query through the caller's own session (RLS applies
// exactly as in the normal UI) plus a real permission check before
// returning anyone else's data. See lib/assistant/intents.ts.
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: appUser } = await supabase.from("app_users").select("employee_id").eq("id", user.id).single();
  const callerEmployeeId = appUser?.employee_id ?? null;

  const { text, pendingAction } = (await request.json()) as { text?: string; pendingAction?: PendingAction };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const result = await handleMessage({ supabase, callerId: user.id, callerEmployeeId }, text, pendingAction);
  return NextResponse.json(result);
}
