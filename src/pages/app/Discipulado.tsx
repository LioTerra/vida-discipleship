import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, User } from "lucide-react";

const Discipulado = () => {
  const { user } = useAuth();

  const { data: mentorships, isLoading } = useQuery({
    queryKey: ["my-mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*, mentor:profiles!mentorships_mentor_id_fkey(nome), mentee:profiles!mentorships_mentee_id_fkey(nome)")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Discipulado</h1>
        <p className="text-muted-foreground">Seus vínculos de mentoria</p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !mentorships?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Você ainda não está vinculado a nenhuma mentoria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {mentorships.map((m) => {
            const isMentor = m.mentor_id === user!.id;
            return (
              <Card key={m.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    {isMentor
                      ? `Mentorado: ${(m.mentee as any)?.nome}`
                      : `Mentor: ${(m.mentor as any)?.nome}`}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className="text-primary capitalize">{m.status}</span>
                  </p>
                  {m.started_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Início: {new Date(m.started_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Discipulado;
