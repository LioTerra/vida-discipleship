import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AvaliacaoFormProps {
  mentorshipId: string;
}

const CATEGORIAS = [
  { key: "devocional", label: "Devocional" },
  { key: "oracao", label: "Oração" },
  { key: "comunhao", label: "Comunhão" },
  { key: "evangelismo", label: "Evangelismo" },
] as const;

type CategoriaKey = (typeof CATEGORIAS)[number]["key"];

const ScoreSelector = ({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) => (
  <div className="space-y-1">
    <Label className="text-sm">{label}</Label>
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="p-1 transition-colors"
        >
          <Star
            className={cn(
              "h-5 w-5",
              n <= value
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            )}
          />
        </button>
      ))}
    </div>
  </div>
);

export default function AvaliacaoForm({ mentorshipId }: AvaliacaoFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [semana, setSemana] = useState<Date>(new Date());
  const [scores, setScores] = useState<Record<CategoriaKey, number>>({
    devocional: 3,
    oracao: 3,
    comunhao: 3,
    evangelismo: 3,
  });
  const [observacoes, setObservacoes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("avaliacoes").insert({
        mentorship_id: mentorshipId,
        author_id: user!.id,
        semana: format(semana, "yyyy-MM-dd"),
        ...scores,
        observacoes: observacoes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação registrada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["avaliacoes", mentorshipId] });
      setObservacoes("");
      setScores({ devocional: 3, oracao: 3, comunhao: 3, evangelismo: 3 });
    },
    onError: () => {
      toast.error("Erro ao registrar avaliação.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nova Avaliação Semanal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm">Semana</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !semana && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(semana, "PPP", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={semana}
                onSelect={(d) => d && setSemana(d)}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {CATEGORIAS.map((cat) => (
            <ScoreSelector
              key={cat.key}
              label={cat.label}
              value={scores[cat.key]}
              onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
            />
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Observações</Label>
          <Textarea
            placeholder="Anotações sobre a semana..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={1000}
          />
        </div>

        <Button
          className="w-full"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Registrar Avaliação"}
        </Button>
      </CardContent>
    </Card>
  );
}
