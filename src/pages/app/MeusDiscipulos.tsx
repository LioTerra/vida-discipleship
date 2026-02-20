import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users2, User } from "lucide-react";

const MeusDiscipulos = () => {
  const { user, profile } = useAuth();

  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return <Navigate to="/app/inicio" replace />;
  }

  const { data: mentorships, isLoading } = useQuery({
    queryKey: ["my-mentees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*, mentee:profiles!mentorships_mentee_id_fkey(nome, email)")
        .eq("mentor_id", user!.id)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meus Discípulos</h1>
        <p className="text-muted-foreground">Mentorados atribuídos a você</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !mentorships?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhum discípulo atribuído a você ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mentorships.map((m) => (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {(m.mentee as any)?.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {(m.mentee as any)?.email}
                </p>
                {m.started_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Desde: {new Date(m.started_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusDiscipulos;
