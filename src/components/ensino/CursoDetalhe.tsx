import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CheckCircle, Circle, Video, Headphones, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Curso = Tables<"cursos">;
type Modulo = Tables<"modulos">;
type Aula = Tables<"aulas">;

interface CursoDetalheProps {
  curso: Curso;
  onVoltar: () => void;
}

const tipoIcon = {
  video: Video,
  audio: Headphones,
  texto: FileText,
};

const tipoLabel = {
  video: "Vídeo",
  audio: "Áudio",
  texto: "Texto",
};

const CursoDetalhe = ({ curso, onVoltar }: CursoDetalheProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: modulos, isLoading: loadingModulos } = useQuery({
    queryKey: ["modulos", curso.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos")
        .select("*")
        .eq("curso_id", curso.id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: aulas } = useQuery({
    queryKey: ["aulas", curso.id],
    enabled: !!modulos?.length,
    queryFn: async () => {
      const moduloIds = modulos!.map((m) => m.id);
      const { data, error } = await supabase
        .from("aulas")
        .select("*")
        .in("modulo_id", moduloIds)
        .order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: progresso } = useQuery({
    queryKey: ["progresso-curso", curso.id, user?.id],
    enabled: !!user && !!aulas?.length,
    queryFn: async () => {
      const aulaIds = aulas!.map((a) => a.id);
      const { data, error } = await supabase
        .from("progresso")
        .select("aula_id, concluido")
        .eq("user_id", user!.id)
        .in("aula_id", aulaIds);
      if (error) throw error;
      return data;
    },
  });

  const toggleProgresso = useMutation({
    mutationFn: async ({ aulaId, concluido }: { aulaId: string; concluido: boolean }) => {
      if (concluido) {
        // Mark as complete — upsert
        const { error } = await supabase.from("progresso").upsert(
          {
            user_id: user!.id,
            aula_id: aulaId,
            concluido: true,
            concluido_at: new Date().toISOString(),
          },
          { onConflict: "user_id,aula_id" }
        );
        if (error) throw error;
      } else {
        // Mark as incomplete
        const { error } = await supabase
          .from("progresso")
          .update({ concluido: false, concluido_at: null })
          .eq("user_id", user!.id)
          .eq("aula_id", aulaId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["progresso-curso", curso.id] });
      queryClient.invalidateQueries({ queryKey: ["progresso-user"] });
      queryClient.invalidateQueries({ queryKey: ["progresso-count"] });
    },
    onError: () => {
      toast({ title: "Erro ao salvar progresso", variant: "destructive" });
    },
  });

  const isAulaConcluida = (aulaId: string) => {
    return progresso?.some((p) => p.aula_id === aulaId && p.concluido);
  };

  const getAulasDoModulo = (moduloId: string) => {
    return aulas?.filter((a) => a.modulo_id === moduloId) ?? [];
  };

  const getProgressoModulo = (moduloId: string) => {
    const aulasModulo = getAulasDoModulo(moduloId);
    if (aulasModulo.length === 0) return { concluidas: 0, total: 0 };
    const concluidas = aulasModulo.filter((a) => isAulaConcluida(a.id)).length;
    return { concluidas, total: aulasModulo.length };
  };

  const totalAulas = aulas?.length ?? 0;
  const totalConcluidas = aulas?.filter((a) => isAulaConcluida(a.id)).length ?? 0;
  const pctGeral = totalAulas > 0 ? Math.round((totalConcluidas / totalAulas) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{curso.titulo}</h1>
          {curso.descricao && (
            <p className="text-muted-foreground">{curso.descricao}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>{totalConcluidas}/{totalAulas} aulas concluídas</span>
        <Badge variant={pctGeral === 100 ? "default" : "secondary"}>
          {pctGeral}%
        </Badge>
      </div>

      {loadingModulos ? (
        <p className="text-muted-foreground">Carregando módulos...</p>
      ) : !modulos?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum módulo disponível neste curso.
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {modulos.map((modulo) => {
            const { concluidas, total } = getProgressoModulo(modulo.id);
            const aulasModulo = getAulasDoModulo(modulo.id);

            return (
              <AccordionItem
                key={modulo.id}
                value={modulo.id}
                className="border border-border rounded-lg px-4"
              >
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 text-left">
                    <div>
                      <span className="font-medium">{modulo.titulo}</span>
                      {modulo.descricao && (
                        <p className="text-xs text-muted-foreground">{modulo.descricao}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="ml-auto mr-2 shrink-0">
                      {concluidas}/{total}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-1 pb-2">
                    {aulasModulo.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">Nenhuma aula neste módulo.</p>
                    ) : (
                      aulasModulo.map((aula) => {
                        const concluida = isAulaConcluida(aula.id);
                        const Icon = tipoIcon[aula.tipo] ?? FileText;

                        return (
                          <div
                            key={aula.id}
                            className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-secondary/50 transition-colors"
                          >
                            <button
                              onClick={() =>
                                toggleProgresso.mutate({
                                  aulaId: aula.id,
                                  concluido: !concluida,
                                })
                              }
                              className="shrink-0"
                              title={concluida ? "Marcar como não concluída" : "Marcar como concluída"}
                            >
                              {concluida ? (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span
                              className={`text-sm flex-1 ${
                                concluida ? "text-muted-foreground line-through" : ""
                              }`}
                            >
                              {aula.titulo}
                            </span>
                            {aula.duracao_min && (
                              <span className="text-xs text-muted-foreground shrink-0">
                                {aula.duracao_min} min
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

export default CursoDetalhe;
