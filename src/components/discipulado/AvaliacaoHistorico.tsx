import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvaliacaoHistoricoProps {
  mentorshipId: string;
}

const CATEGORIAS = [
  { key: "devocional", label: "Devocional" },
  { key: "oracao", label: "Oração" },
  { key: "comunhao", label: "Comunhão" },
  { key: "evangelismo", label: "Evangelismo" },
] as const;

const Stars = ({ value }: { value: number | null }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={cn(
          "h-3.5 w-3.5",
          value && n <= value
            ? "fill-primary text-primary"
            : "text-muted-foreground/30"
        )}
      />
    ))}
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
      <h3 className="text-sm font-semibold text-muted-foreground">Histórico de Avaliações</h3>
      {avaliacoes.map((av) => (
        <Card key={av.id} className="bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>
                Semana: {new Date(av.semana + "T00:00:00").toLocaleDateString("pt-BR")}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                por {(av.author as any)?.nome}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((cat) => (
                <div key={cat.key} className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                  <Stars value={(av as any)[cat.key]} />
                </div>
              ))}
            </div>
            {av.observacoes && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                "{av.observacoes}"
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
