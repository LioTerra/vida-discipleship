import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronRight, Settings } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import CursoDetalhe from "@/components/ensino/CursoDetalhe";
import GerenciarConteudo from "@/components/ensino/GerenciarConteudo";
import type { Tables } from "@/integrations/supabase/types";

type Curso = Tables<"cursos">;

const Ensino = () => {
  const { user, profile } = useAuth();
  const [cursoAberto, setCursoAberto] = useState<Curso | null>(null);
  const [gerenciando, setGerenciando] = useState(false);
  const isStaffOrAdmin = profile?.role === "admin" || profile?.role === "staff";

  const { data: cursos, isLoading } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  // Fetch all user progress to calculate per-course percentages
  const { data: progresso } = useQuery({
    queryKey: ["progresso-user", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progresso")
        .select("aula_id, concluido")
        .eq("user_id", user!.id)
        .eq("concluido", true);
      if (error) throw error;
      return data;
    },
  });

  // Fetch aulas grouped by curso for progress calculation
  const { data: aulasPorCurso } = useQuery({
    queryKey: ["aulas-por-curso"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("aulas")
        .select("id, modulo_id, modulos!inner(curso_id)");
      if (error) throw error;
      return data as Array<{ id: string; modulo_id: string; modulos: { curso_id: string } }>;
    },
  });

  const getProgressoCurso = (cursoId: string) => {
    if (!aulasPorCurso || !progresso) return 0;
    const aulasDoCurso = aulasPorCurso.filter((a) => a.modulos.curso_id === cursoId);
    if (aulasDoCurso.length === 0) return 0;
    const progressoIds = new Set(progresso.map((p) => p.aula_id));
    const concluidas = aulasDoCurso.filter((a) => progressoIds.has(a.id)).length;
    return Math.round((concluidas / aulasDoCurso.length) * 100);
  };

  if (gerenciando && isStaffOrAdmin) {
    return <GerenciarConteudo onVoltar={() => setGerenciando(false)} />;
  }

  if (cursoAberto) {
    return <CursoDetalhe curso={cursoAberto} onVoltar={() => setCursoAberto(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ensino</h1>
          <p className="text-muted-foreground">Cursos disponíveis para você</p>
        </div>
        {isStaffOrAdmin && (
          <Button variant="outline" onClick={() => setGerenciando(true)} className="gap-2">
            <Settings className="h-4 w-4" /> Gerenciar Conteúdo
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando cursos...</p>
      ) : !cursos?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum curso disponível ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso) => {
            const pct = getProgressoCurso(curso.id);
            return (
              <Card
                key={curso.id}
                className="hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => setCursoAberto(curso)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {curso.descricao && (
                    <CardDescription>{curso.descricao}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Progress value={pct} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-2">{pct}% concluído</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Ensino;
