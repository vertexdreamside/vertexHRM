"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasPermission, type PermissionAction } from "@/lib/permissions";

// Original hook — plain boolean, defaults false while loading. Fine
// for its existing use (hiding/showing an inline control — fail-closed
// during the loading window is the safe default there). Kept
// unchanged since several Admin Ops pages already destructure it as a
// bare boolean.
export function useModulePermission(module: string, action: PermissionAction): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const result = await hasPermission(supabase, user.id, module, action);
      if (!cancelled) setAllowed(result);
    }
    check();
    return () => { cancelled = true; };
  }, [module, action]);

  return allowed;
}

// Second variant that also exposes loading state — needed anywhere
// the permission gates whether to show an entire page's content
// (e.g. Data Export's "Admin only" screen), where the plain hook's
// fail-closed default would flash a wrong "you don't have access"
// message for actual admins during the brief loading window.
export function useModulePermissionWithLoading(module: string, action: PermissionAction): { allowed: boolean; loading: boolean } {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const result = await hasPermission(supabase, user.id, module, action);
      if (!cancelled) {
        setAllowed(result);
        setLoading(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [module, action]);

  return { allowed, loading };
}
