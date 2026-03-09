import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trophy, Flame, Heart } from "lucide-react";

interface AvaliacaoHistoricoProps {
  mentorshipId: string;
}

const CATEGORIAS = [
  { key: "seguranca", label: "Segurança" },
  { key: "sensibilidade", label: "Sensibilidade" },
  { key: "capacidade", label: "Capacidade" },
  { key: "fidelidade", label: "Fidelidade" },
  { key: "influencia", label: "Influência" },
] as const;

const ScoreBar = ({ value, label }: { value: number | null; label: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value ?? "—"}/10</span>
    </div>
    <Progress value={value != null ? value * 10 : 0} className="h-1.5" />
  </div>
);

export default function AvaliacaoHistorico({ mentorshipId }: AvaliacaoHistoricoProps) {
  const { data: avaliacoes, isLoading } = useQuery({
    queryKey: ["avaliacoes", mentorshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("*, author:profiles!avaliacoes_author_id_fkey(nome)")
        .eq("mentorship_id", mentorshipId)
        .order("semana", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  if (!avaliacoes?.length) return <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda.</p>;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Histórico — Pulso de Vida</h3>
      {avaliacoes.map((av: any) => {
        const hasNewFormat = av.seguranca != null || av.sensibilidade != null;

        return (
          <Card key={av.id} className="bg-muted/30">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>
                  Semana: {new Date(av.semana + "T00:00:00").toLocaleDateString("pt-BR")}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  por {av.author?.nome}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0 space-y-3">
              {hasNewFormat ? (
                <>
                  <div className="space-y-2">
                    {CATEGORIAS.map((cat) => (
                      <div key={cat.key}>
                        <ScoreBar value={av[cat.key]} label={cat.label} />
                        {av[`${cat.key}_evidencia`] && (
                          <p className="text-xs text-muted-foreground mt-0.5 italic pl-1">
                            "{av[`${cat.key}_evidencia`]}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {(av.vitoria_semana || av.desafio_semana || av.pedido_oracao) && (
                    <div className="space-y-1.5 pt-2 border-t">
                      {av.vitoria_semana && (
                        <p className="text-xs flex items-center gap-1.5">
                          <Trophy className="h-3 w-3 text-yellow-500 shrink-0" />
                          <span className="text-muted-foreground">{av.vitoria_semana}</span>
                        </p>
                      )}
                      {av.desafio_semana && (
                        <p className="text-xs flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                          <span className="text-muted-foreground">{av.desafio_semana}</span>
                        </p>
                      )}
                      {av.pedido_oracao && (
                        <p className="text-xs flex items-center gap-1.5">
                          <Heart className="h-3 w-3 text-red-500 shrink-0" />
                          <span className="text-muted-foreground">{av.pedido_oracao}</span>
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Fallback for old format entries */
                <>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { key: "devocional", label: "Devocional" },
                      { key: "oracao", label: "Oração" },
                      { key: "comunhao", label: "Comunhão" },
                      { key: "evangelismo", label: "Evangelismo" },
                    ].map((cat) => (
                      <div key={cat.key} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{cat.label}</span>
                        <span className="font-medium">{av[cat.key] ?? "—"}/5</span>
                      </div>
                    ))}
                  </div>
                  {av.observacoes && (
                    <p className="text-xs text-muted-foreground italic">"{av.observacoes}"</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
