import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isLocalPortalDemo, readLocalPortalAuth, type ProfileRole } from "@/lib/portal/local-demo";

export async function requirePortalRoles(roles: ProfileRole[], fallback = "/login") {
  if (isLocalPortalDemo()) {
    if (typeof window === "undefined") return;
    const auth = readLocalPortalAuth();
    if (!auth || !roles.includes(auth.profile.role)) {
      throw redirect({ to: fallback });
    }
    return;
  }

  const { data } = await supabase.auth.getSession();
  if (!data.session) throw redirect({ to: "/login" });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .maybeSingle();
  if (!profile || !roles.includes(profile.role)) {
    throw redirect({ to: fallback });
  }
}
