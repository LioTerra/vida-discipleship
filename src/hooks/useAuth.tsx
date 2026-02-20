import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (isMounted) {
          if (error) {
            console.error("Profile load error:", error.message);
            setProfile(null);
          } else {
            setProfile(data);
          }
        }
      } catch (err) {
        console.error("Profile load exception:", err);
        if (isMounted) setProfile(null);
      }
    };

    // Set up listener FIRST, before getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;

        setUser(session?.user ?? null);

        if (!session?.user) {
          setProfile(null);
          return;
        }

        // Defer Supabase call to avoid Navigator Lock deadlock
        setTimeout(() => {
          if (isMounted) {
            loadProfile(session.user.id).then(() => {
              if (isMounted) setLoading(false);
            });
          }
        }, 0);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session.user);
      loadProfile(session.user.id).then(() => {
        if (isMounted) setLoading(false);
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

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore lock timeout errors
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
