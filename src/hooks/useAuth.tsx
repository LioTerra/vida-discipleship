import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ["/login", "/registro", "/esqueci-senha", "/redefinir-senha"];
const SKIP_ATIVO_CHECK_ROUTES = ["/redefinir-senha", "/reset-password"];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const signingOut = useRef(false);

  const forceSignOut = async (message?: string) => {
    if (signingOut.current) return;
    signingOut.current = true;
    setUser(null);
    setProfile(null);
    try { await supabase.auth.signOut(); } catch {}
    if (message) {
      toast({ title: message, variant: "destructive" });
    }
    navigate("/login?blocked=1", { replace: true });
    setTimeout(() => { signingOut.current = false; }, 500);
  };

  const loadAndCheckProfile = async (userId: string, skipAtivoCheck = false): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error || !data) {
        if (!skipAtivoCheck) {
          await forceSignOut("Seu acesso ainda não foi liberado. Aguarde a confirmação do administrador.");
        }
        return null;
      }

      if (!data.ativo && !skipAtivoCheck) {
        await forceSignOut("Seu acesso ainda não foi liberado. Aguarde a confirmação do administrador.");
        return null;
      }

      return data;
    } catch {
      if (!skipAtivoCheck) {
        await forceSignOut("Seu acesso ainda não foi liberado. Aguarde a confirmação do administrador.");
      }
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted || signingOut.current) return;

        setUser(session?.user ?? null);

        if (!session?.user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        const skipAtivo = SKIP_ATIVO_CHECK_ROUTES.some((r) => window.location.pathname.startsWith(r));

        setTimeout(() => {
          if (!isMounted || signingOut.current) return;
          loadAndCheckProfile(session.user.id, skipAtivo).then((p) => {
            if (isMounted && !signingOut.current) {
              setProfile(p);
              setLoading(false);
            }
          });
        }, 0);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const skipAtivo = SKIP_ATIVO_CHECK_ROUTES.some((r) => window.location.pathname.startsWith(r));

      setUser(session.user);
      loadAndCheckProfile(session.user.id, skipAtivo).then((p) => {
        if (isMounted) {
          setProfile(p);
          setLoading(false);
        }
      });
    }).catch(() => {
      if (isMounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Re-check profile.ativo on every route change
  useEffect(() => {
    if (!user || loading || signingOut.current) return;
    if (PUBLIC_ROUTES.includes(location.pathname)) return;

    const skipAtivo = SKIP_ATIVO_CHECK_ROUTES.some((r) => location.pathname.startsWith(r));
    loadAndCheckProfile(user.id, skipAtivo).then((p) => {
      if (!signingOut.current) {
        setProfile(p);
      }
    });
  }, [location.pathname]);

  const signOut = async () => {
    await forceSignOut();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
