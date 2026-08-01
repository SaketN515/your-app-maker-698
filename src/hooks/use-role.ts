import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AccountRole = "player" | "owner";

/** Reads the signed-in user's roles (RLS scoped to the current user). */
export function useAccountRole() {
  const query = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return { user: null, roles: [] as string[] };
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);
      return {
        user: userData.user,
        roles: (data ?? []).map((r) => r.role as string),
      };
    },
  });

  const roles = query.data?.roles ?? [];
  const isOwner = roles.includes("owner") || roles.includes("admin");

  return {
    ...query,
    user: query.data?.user ?? null,
    roles,
    isOwner,
    role: (isOwner ? "owner" : "player") as AccountRole,
  };
}
