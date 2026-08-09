import type { SupabaseClient } from "@supabase/supabase-js";
import { hasPermission } from "@/lib/permissions";

// A genuinely simple assistant: no LLM, no API key, no cost. Every
// answer comes from matching the message against a small set of
// patterns, then running a real Supabase query (through the caller's
// own session, so RLS applies) or a real permission check before
// looking up anyone else's data. Nothing here writes data except the
// one confirmed leave-application flow, and that only fires after an
// explicit "yes" to a shown summary — never on the first message.

export interface PendingAction {
  type: "apply_leave" | "employee_lookup";
  awaiting: "leaveType" | "confirmation" | "employeeChoice";
  fromDate?: string;
  toDate?: string;
  leaveTypeId?: string;
  leaveTypeName?: string;
  field?: "job_title";
  matches?: { id: string; full_name: string }[];
}

export interface AssistantResult {
  reply: string;
  navigate?: string;
  pendingAction?: PendingAction;
}

interface Ctx {
  supabase: SupabaseClient;
  callerId: string;
  callerEmployeeId: string | null;
}

const AFFIRMATIVE = /^(yes|yep|yeah|y|confirm|submit|do it|go ahead)\b/i;
const NEGATIVE = /^(no|nope|n|cancel|don't|stop)\b/i;

function businessDays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Recognizes "2026-03-01 to 2026-03-05", "2026-03-01 - 2026-03-05",
// or a single "2026-03-01" (treated as a one-day range). Deliberately
// doesn't try to parse "next Monday" or month names — that needs real
// NLU, which is exactly the part a rule-based design can't do well;
// asking for an explicit date is the honest tradeoff.
function extractDateRange(text: string): { from: string; to: string } | null {
  const isoPair = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-|through|until)\s*(\d{4}-\d{2}-\d{2})/i);
  if (isoPair) return { from: isoPair[1], to: isoPair[2] };
  const isoSingle = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoSingle) return { from: isoSingle[1], to: isoSingle[1] };
  return null;
}

async function findEmployeeByName(supabase: SupabaseClient, name: string) {
  const { data } = await supabase.from("employees").select("id, full_name").ilike("full_name", `%${name.trim()}%`).limit(5);
  return data ?? [];
}

// Pulls a probable name out of phrasings like "what is john doe's job
// title", "john doe post title", "job title of john doe".
function extractNameForLookup(text: string): string | null {
  const patterns = [
    /(?:job title|post title|position|role) (?:of|for) (.+)/i,
    /what(?:'s| is) (.+?)(?:'s)? (?:job title|post title|position|role)/i,
    /(.+?)(?:'s)? (?:job title|post title|position|role)/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].replace(/[?.!]/g, "").trim();
  }
  return null;
}

export async function handleMessage(
  ctx: Ctx,
  text: string,
  pending: PendingAction | undefined
): Promise<AssistantResult> {
  const { supabase, callerId, callerEmployeeId } = ctx;
  const lower = text.toLowerCase();

  // ---- Continue a pending multi-step action first ----
  if (pending?.type === "apply_leave" && pending.awaiting === "leaveType") {
    const { data: types } = await supabase.from("leave_type_defaults").select("id, name");
    const match = (types ?? []).find((t) => lower.includes(t.name.toLowerCase()));
    if (!match) {
      return {
        reply: `I didn't recognize that leave type. Options: ${(types ?? []).map((t) => t.name).join(", ")}.`,
        pendingAction: pending
      };
    }
    const days = businessDays(pending.fromDate!, pending.toDate!);
    return {
      reply: `Apply for ${match.name} from ${pending.fromDate} to ${pending.toDate} (${days} business day${days === 1 ? "" : "s"})? Reply "yes" to submit.`,
      pendingAction: { type: "apply_leave", awaiting: "confirmation", fromDate: pending.fromDate, toDate: pending.toDate, leaveTypeId: match.id, leaveTypeName: match.name }
    };
  }

  if (pending?.type === "apply_leave" && pending.awaiting === "confirmation") {
    if (NEGATIVE.test(lower)) return { reply: "No problem — not submitted." };
    if (!AFFIRMATIVE.test(lower)) {
      return { reply: 'Reply "yes" to submit, or "no" to cancel.', pendingAction: pending };
    }
    if (!callerEmployeeId) return { reply: "Your login isn't linked to an employee record, so I can't submit this for you." };
    const days = businessDays(pending.fromDate!, pending.toDate!);
    const { error } = await supabase.from("leave_requests").insert({
      employee_id: callerEmployeeId,
      leave_type_id: pending.leaveTypeId,
      from_date: pending.fromDate,
      to_date: pending.toDate,
      days,
      status: "Pending"
    });
    if (error) return { reply: `That didn't go through: ${error.message}` };
    return { reply: `Done — submitted ${pending.leaveTypeName} from ${pending.fromDate} to ${pending.toDate}. You can track it under Leave → My Leave.`, navigate: "/leave?tab=myleave" };
  }

  if (pending?.type === "employee_lookup" && pending.awaiting === "employeeChoice") {
    const match = (pending.matches ?? []).find((m) => lower.includes(m.full_name.toLowerCase()));
    if (!match) return { reply: "Which one did you mean? " + (pending.matches ?? []).map((m) => m.full_name).join(", "), pendingAction: pending };
    return lookupJobTitle(supabase, callerId, match.id, match.full_name);
  }

  // ---- Fresh intents ----
  if (/apply.*leave|take.*leave|book.*leave/.test(lower)) {
    const range = extractDateRange(text);
    if (!range) {
      return { reply: 'What dates? Use a format like "apply for leave 2026-03-01 to 2026-03-05".' };
    }
    const { data: types } = await supabase.from("leave_type_defaults").select("id, name");
    const match = (types ?? []).find((t) => lower.includes(t.name.toLowerCase()));
    if (!match) {
      return {
        reply: `What type of leave? Options: ${(types ?? []).map((t) => t.name).join(", ")}.`,
        pendingAction: { type: "apply_leave", awaiting: "leaveType", fromDate: range.from, toDate: range.to }
      };
    }
    const days = businessDays(range.from, range.to);
    return {
      reply: `Apply for ${match.name} from ${range.from} to ${range.to} (${days} business day${days === 1 ? "" : "s"})? Reply "yes" to submit.`,
      pendingAction: { type: "apply_leave", awaiting: "confirmation", fromDate: range.from, toDate: range.to, leaveTypeId: match.id, leaveTypeName: match.name }
    };
  }

  if (/job title|post title|position|what does .+ do\b/.test(lower)) {
    const name = extractNameForLookup(text);
    if (!name) return { reply: "Whose job title do you want? Try \"what is John Doe's job title\"." };
    const matches = await findEmployeeByName(supabase, name);
    if (matches.length === 0) return { reply: `I couldn't find anyone named "${name}".` };
    if (matches.length > 1) {
      return {
        reply: `A few people match "${name}": ${matches.map((m) => m.full_name).join(", ")}. Which one?`,
        pendingAction: { type: "employee_lookup", awaiting: "employeeChoice", field: "job_title", matches }
      };
    }
    return lookupJobTitle(supabase, callerId, matches[0].id, matches[0].full_name);
  }

  if (/leave balance|days.*(remaining|left|due)|how many.*leave/.test(lower)) {
    const nameMatch = text.match(/(?:does|for|of)\s+([a-z][a-z .]+?)\s+have/i);
    if (nameMatch) {
      const authorized = await hasPermission(supabase, callerId, "leave", "can_view");
      if (!authorized) return { reply: "You don't have permission to view other employees' leave information." };
      const matches = await findEmployeeByName(supabase, nameMatch[1]);
      if (matches.length === 0) return { reply: `I couldn't find anyone named "${nameMatch[1].trim()}".` };
      if (matches.length > 1) return { reply: `A few people match: ${matches.map((m) => m.full_name).join(", ")}. Try their full name.` };
      return leaveBalanceReply(supabase, matches[0].id, matches[0].full_name);
    }
    if (!callerEmployeeId) return { reply: "Your login isn't linked to an employee record yet." };
    return leaveBalanceReply(supabase, callerEmployeeId, null);
  }

  if (/timesheet/.test(lower)) {
    if (!callerEmployeeId) return { reply: "Your login isn't linked to an employee record yet." };
    const { data } = await supabase.from("timesheets").select("week_starting, status").eq("employee_id", callerEmployeeId).order("week_starting", { ascending: false }).limit(1).single();
    if (!data) return { reply: "No timesheet found for the current week yet.", navigate: "/time?tab=timesheets-my" };
    return { reply: `Your timesheet for the week of ${data.week_starting} is currently ${data.status}.`, navigate: "/time?tab=timesheets-my" };
  }

  if (/who.*on leave|on leave today/.test(lower)) {
    const authorized = await hasPermission(supabase, callerId, "leave", "can_view");
    if (!authorized) return { reply: "You don't have permission to view organization-wide leave information." };
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("leave_requests").select("employees(full_name)").eq("status", "Approved").lte("from_date", today).gte("to_date", today);
    const names = (data ?? []).map((r) => (Array.isArray(r.employees) ? r.employees[0] : r.employees)?.full_name).filter(Boolean);
    return { reply: names.length ? `On leave today: ${names.join(", ")}.` : "Nobody is on approved leave today." };
  }

  if (/pending approval|waiting.*approv|need.*approv/.test(lower)) {
    const canApproveLeave = await hasPermission(supabase, callerId, "leave", "can_approve");
    if (!canApproveLeave) return { reply: "You don't have approval permissions, so there's nothing pending for you specifically." };
    const { count } = await supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "Pending");
    return { reply: `${count ?? 0} leave request(s) are waiting on approval.`, navigate: "/leave?tab=leavelist" };
  }

  const nav = matchNavigation(lower);
  if (nav) return { reply: `Opening that now.`, navigate: nav };

  return {
    reply: "I can help with: leave balances, applying for leave, timesheet status, who's on leave, pending approvals, an employee's job title, or navigating to a page. Try rephrasing, or check the Help Centre for anything broader."
  };
}

async function leaveBalanceReply(supabase: SupabaseClient, employeeId: string, name: string | null) {
  const [typesRes, entRes, reqRes] = await Promise.all([
    supabase.from("leave_type_defaults").select("id, name, configured_days"),
    supabase.from("employee_leave_entitlements").select("leave_type_id, entitled_days").eq("employee_id", employeeId),
    supabase.from("leave_requests").select("days, leave_type_id").eq("employee_id", employeeId).eq("status", "Approved")
  ]);
  const lines = (typesRes.data ?? []).map((t) => {
    const entitled = entRes.data?.find((e) => e.leave_type_id === t.id)?.entitled_days ?? t.configured_days;
    const taken = (reqRes.data ?? []).filter((r) => r.leave_type_id === t.id).reduce((s, r) => s + Number(r.days), 0);
    return `${t.name}: ${entitled - taken} day(s) left`;
  });
  const who = name ? `${name} has` : "You have";
  return { reply: `${who} — ${lines.join(", ")}.` };
}

async function lookupJobTitle(supabase: SupabaseClient, callerId: string, employeeId: string, name: string): Promise<AssistantResult> {
  const authorized = await hasPermission(supabase, callerId, "employees", "can_view");
  if (!authorized) return { reply: "You don't have permission to view other employees' details." };
  const { data } = await supabase.from("employees").select("job_title").eq("id", employeeId).single();
  return { reply: data?.job_title ? `${name}'s job title is ${data.job_title}.` : `${name} doesn't have a job title on file.` };
}

const PAGE_PATHS: Record<string, string> = {
  dashboard: "/dashboard",
  "my leave": "/leave?tab=myleave",
  "apply leave": "/leave?tab=apply",
  "leave list": "/leave?tab=leavelist",
  "my timesheet": "/time?tab=timesheets-my",
  attendance: "/time?tab=attendance-my",
  "my info": "/myinfo",
  performance: "/performance",
  recruitment: "/recruitment",
  help: "/help"
};

function matchNavigation(lower: string): string | null {
  if (!/^(open|show|take me to|go to|navigate to)\b/.test(lower)) return null;
  for (const [label, path] of Object.entries(PAGE_PATHS)) {
    if (lower.includes(label)) return path;
  }
  return null;
}
