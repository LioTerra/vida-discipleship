import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users2, User, BookOpen, Star, ChevronRight, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AvaliacaoForm from "@/components/discipulado/AvaliacaoForm";
import AvaliacaoHistorico from "@/components/discipulado/AvaliacaoHistorico";

const MeusDiscipulos = () => {
  const { user, profile } = useAuth();
  const [selectedMentorship, setSelectedMentorship] = useState<any>(null);

  if (profile?.role !== "staff" && profile?.role !== "admin") {
    return <Navigate to="/app/inicio" replace />;
  }

  const { data: mentorships, isLoading } = useQuery({
    queryKey: ["my-mentees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*, mentee:profiles!mentorships_mentee_id_fkey(id, nome, email)")
        .eq("mentor_id", user!.id)
        .eq("status", "ativo");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch all mentee IDs for batch queries
  const menteeIds = mentorships?.map((m) => (m.mentee as any)?.id).filter(Boolean) ?? [];
  const mentorshipIds = mentorships?.map((m) => m.id) ?? [];

  // Fetch progress for all mentees
  const { data: progressData } = useQuery({
    queryKey: ["mentees-progress", menteeIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progresso")
        .select("user_id, concluido, aula_id")
        .in("user_id", menteeIds)
        .eq("concluido", true);
      if (error) throw error;
      return data;
    },
    enabled: menteeIds.length > 0,
  });

  // Fetch total lessons count
  const { data: totalAulas } = useQuery({
    queryKey: ["total-aulas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aulas").select("id");
      if (error) throw error;
      return data?.length ?? 0;
    },
    enabled: menteeIds.length > 0,
  });

  // Fetch latest evaluations for each mentorship
  const { data: latestAvaliacoes } = useQuery({
    queryKey: ["mentees-avaliacoes", mentorshipIds],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("mentorship_id, semana, devocional, oracao, comunhao, evangelismo")
        .in("mentorship_id", mentorshipIds)
        .order("semana", { ascending: false });
      if (error) throw error;
      // Group by mentorship, keep only latest
      const grouped: Record<string, typeof data[0]> = {};
      data?.forEach((a) => {
        if (!grouped[a.mentorship_id]) grouped[a.mentorship_id] = a;
      });
      return grouped;
    },
    enabled: mentorshipIds.length > 0,
  });

  const getMenteeProgress = (menteeId: string) => {
    if (!progressData || !totalAulas) return 0;
    const completed = progressData.filter((p) => p.user_id === menteeId).length;
    return totalAulas > 0 ? Math.round((completed / totalAulas) * 100) : 0;
  };

  const getAvgScore = (eval_: any) => {
    if (!eval_) return null;
    const scores = [eval_.devocional, eval_.oracao, eval_.comunhao, eval_.evangelismo].filter(
      (s) => s != null
    );
    return scores.length > 0 ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : null;
  };

  // Detail view for a selected mentee
  if (selectedMentorship) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => setSelectedMentorship(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {(selectedMentorship.mentee as any)?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <p>{(selectedMentorship.mentee as any)?.email}</p>
            {selectedMentorship.started_at && (
              <p>Desde: {new Date(selectedMentorship.started_at).toLocaleDateString("pt-BR")}</p>
            )}
            <div className="flex items-center gap-2 pt-2">
              <BookOpen className="h-4 w-4" />
              <span>Progresso nos cursos:</span>
              <span className="font-medium text-foreground">
                {getMenteeProgress((selectedMentorship.mentee as any)?.id)}%
              </span>
            </div>
            <Progress value={getMenteeProgress((selectedMentorship.mentee as any)?.id)} className="h-2 mt-1" />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <AvaliacaoForm mentorshipId={selectedMentorship.id} />
          <AvaliacaoHistorico mentorshipId={selectedMentorship.id} />
        </div>
      </div>
    );
  }

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
          {mentorships.map((m) => {
            const mentee = m.mentee as any;
            const pct = getMenteeProgress(mentee?.id);
            const latestEval = latestAvaliacoes?.[m.id];
            const avg = getAvgScore(latestEval);

            return (
              <Card
                key={m.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedMentorship(m)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      {mentee?.nome}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{mentee?.email}</p>

                  {/* Course progress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" /> Cursos
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>

                  {/* Latest evaluation */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-3 w-3" /> Última avaliação
                    </span>
                    {avg ? (
                      <Badge variant="secondary" className="text-xs">
                        {avg}/5
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>

                  {m.started_at && (
                    <p className="text-xs text-muted-foreground">
                      Desde: {new Date(m.started_at).toLocaleDateString("pt-BR")}
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

export default MeusDiscipulos;
