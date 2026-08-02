import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Maps each record type the UI offers to its actual table and the
// date column "older than" filters against. Different tables use
// different column names for "when this happened" (submission date,
// week starting, creation timestamp) — this is the one place that
// mapping lives, so the UI dropdown doesn't need to know it.
const TARGETS: Record<string, { table: string; dateColumn: string }> = {
  leave_requests: { table: "leave_requests", dateColumn: "created_at" },
  timesheets: { table: "timesheets", dateColumn: "week_starting" },
  claims: { table: "claims", dateColumn: "submitted_date" },
  audit_log: { table: "audit_log", dateColumn: "created_at" }
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // TODO: this only checks "are you logged in" — same authorization
  // gap as every other privileged route in this build until Roles &
  // Permissions is actually enforced server-side. For a
  // permanent-delete action this is the most important place that gap
  // should get closed first, once there's a real check to hang it on.

  const { recordType, olderThan, confirm } = await request.json();
  const target = TARGETS[recordType];
  if (!target || !olderThan) {
    return NextResponse.json({ error: "Invalid record type or date" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from(target.table)
    .select("id", { count: "exact", head: true })
    .lt(target.dateColumn, olderThan);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  // Preview-only call — count back, don't touch anything yet.
  if (!confirm) {
    return NextResponse.json({ count: count ?? 0 });
  }

  const { error: deleteError } = await admin.from(target.table).delete().lt(target.dateColumn, olderThan);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  const { error: logError } = await admin.from("maintenance_purge_log").insert({
    performed_by: user.id,
    record_type: recordType,
    older_than: olderThan,
    records_deleted: count ?? 0
  });
  if (logError) {
    // The purge already happened — surface the logging failure
    // separately rather than implying nothing was deleted.
    return NextResponse.json({ deleted: count ?? 0, warning: `Purge succeeded but logging it failed: ${logError.message}` });
  }

  return NextResponse.json({ deleted: count ?? 0 });
}
