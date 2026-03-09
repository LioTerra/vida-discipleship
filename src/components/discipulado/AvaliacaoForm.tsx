import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { CalendarIcon, Trophy, Flame, Heart } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AvaliacaoFormProps {
  mentorshipId: string;
}

const CATEGORIAS = [
  {
    key: "seguranca",
    label: "Segurança",
    descricao: "O quanto você caminhou a semana com paz e confiança em Deus, sem ser dominado por medo/insegurança.",
  },
  {
    key: "sensibilidade",
    label: "Sensibilidade",
    descricao: "O quanto você conseguiu perceber a voz de Deus nas pequenas coisas e nas decisões do dia a dia.",
  },
  {
    key: "capacidade",
    label: "Capacidade",
    descricao: "O quanto você conseguiu aplicar o tema da contemplação (levantar os olhos) em situações reais.",
  },
  {
    key: "fidelidade",
    label: "Fidelidade",
    descricao: "O quanto você manteve seus compromissos com Deus, com a igreja, com a família e com o trabalho.",
  },
  {
    key: "influencia",
    label: "Influência",
    descricao: "O quanto você conseguiu abençoar ou servir alguém (mesmo que de forma simples) esta semana.",
  },
] as const;

type CategoriaKey = (typeof CATEGORIAS)[number]["key"];

interface Scores {
  seguranca: number;
  sensibilidade: number;
  capacidade: number;
  fidelidade: number;
  influencia: number;
}

interface Evidencias {
  seguranca: string;
  sensibilidade: string;
  capacidade: string;
  fidelidade: string;
  influencia: string;
}

const ScoreSlider = ({
  value,
  onChange,
  label,
  descricao,
  evidencia,
  onEvidenciaChange,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  descricao: string;
  evidencia: string;
  onEvidenciaChange: (v: string) => void;
}) => (
  <div className="space-y-3 p-4 rounded-lg border bg-muted/20">
    <div className="flex items-center justify-between">
      <Label className="text-sm font-semibold">{label}</Label>
      <span className="text-lg font-bold text-primary">{value}/10</span>
    </div>
    <p className="text-xs text-muted-foreground">{descricao}</p>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={0}
      max={10}
      step={1}
      className="py-2"
    />
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Evidência (1 linha)</Label>
      <Input
        placeholder="Descreva brevemente..."
        value={evidencia}
        onChange={(e) => onEvidenciaChange(e.target.value)}
        maxLength={300}
      />
    </div>
  </div>
);

export default function AvaliacaoForm({ mentorshipId }: AvaliacaoFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [semana, setSemana] = useState<Date>(new Date());
  const [scores, setScores] = useState<Scores>({
    seguranca: 5,
    sensibilidade: 5,
    capacidade: 5,
    fidelidade: 5,
    influencia: 5,
  });
  const [evidencias, setEvidencias] = useState<Evidencias>({
    seguranca: "",
    sensibilidade: "",
    capacidade: "",
    fidelidade: "",
    influencia: "",
  });
  const [vitoriaSemana, setVitoriaSemana] = useState("");
  const [desafioSemana, setDesafioSemana] = useState("");
  const [pedidoOracao, setPedidoOracao] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("avaliacoes").insert({
        mentorship_id: mentorshipId,
        author_id: user!.id,
        semana: format(semana, "yyyy-MM-dd"),
        seguranca: scores.seguranca,
        seguranca_evidencia: evidencias.seguranca.trim() || null,
        sensibilidade: scores.sensibilidade,
        sensibilidade_evidencia: evidencias.sensibilidade.trim() || null,
        capacidade: scores.capacidade,
        capacidade_evidencia: evidencias.capacidade.trim() || null,
        fidelidade: scores.fidelidade,
        fidelidade_evidencia: evidencias.fidelidade.trim() || null,
        influencia: scores.influencia,
        influencia_evidencia: evidencias.influencia.trim() || null,
        vitoria_semana: vitoriaSemana.trim() || null,
        desafio_semana: desafioSemana.trim() || null,
        pedido_oracao: pedidoOracao.trim() || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pulso de Vida registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["avaliacoes", mentorshipId] });
      setScores({ seguranca: 5, sensibilidade: 5, capacidade: 5, fidelidade: 5, influencia: 5 });
      setEvidencias({ seguranca: "", sensibilidade: "", capacidade: "", fidelidade: "", influencia: "" });
      setVitoriaSemana("");
      setDesafioSemana("");
      setPedidoOracao("");
    },
    onError: () => {
      toast.error("Erro ao registrar avaliação.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pulso de Vida</CardTitle>
        <CardDescription className="text-xs italic">
          "Exortai-vos uns aos outros todos os dias..." (Hebreus 3:13)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Semana picker */}
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

        {/* Category sliders */}
        <div className="space-y-3">
          {CATEGORIAS.map((cat) => (
            <ScoreSlider
              key={cat.key}
              label={cat.label}
              descricao={cat.descricao}
              value={scores[cat.key]}
              onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
              evidencia={evidencias[cat.key]}
              onEvidenciaChange={(v) => setEvidencias((s) => ({ ...s, [cat.key]: v }))}
            />
          ))}
        </div>

        {/* Extra fields */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-500" /> Vitória da Semana
            </Label>
            <Input
              placeholder="1 linha sobre sua vitória..."
              value={vitoriaSemana}
              onChange={(e) => setVitoriaSemana(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-orange-500" /> Desafio da Semana
            </Label>
            <Input
              placeholder="1 linha sobre seu desafio..."
              value={desafioSemana}
              onChange={(e) => setDesafioSemana(e.target.value)}
              maxLength={300}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500" /> Pedido de Oração
            </Label>
            <Input
              placeholder="1 linha com seu pedido..."
              value={pedidoOracao}
              onChange={(e) => setPedidoOracao(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Salvando..." : "Registrar Pulso de Vida"}
        </Button>
      </CardContent>
    </Card>
  );
}
