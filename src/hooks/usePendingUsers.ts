import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function usePendingUsers() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const { data: count = 0 } = useQuery({
    queryKey: ["pending-users-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("ativo", false);
      return count ?? 0;
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  return isAdmin ? count : 0;
}
