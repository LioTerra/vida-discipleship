import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

interface PulsoDeVidaRadarProps {
  mentorshipId: string;
}

const AXES = [
  { key: "seguranca", label: "Segurança" },
  { key: "sensibilidade", label: "Sensibilidade" },
  { key: "capacidade", label: "Capacidade" },
  { key: "fidelidade", label: "Fidelidade" },
  { key: "influencia", label: "Influência" },
] as const;

export default function PulsoDeVidaRadar({ mentorshipId }: PulsoDeVidaRadarProps) {
  const { data: avaliacao, isLoading } = useQuery({
    queryKey: ["pulso-radar", mentorshipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("seguranca, sensibilidade, capacidade, fidelidade, influencia, semana")
        .eq("mentorship_id", mentorshipId)
        .order("semana", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const hasData =
    avaliacao &&
    AXES.some((a) => (avaliacao as any)[a.key] != null);

  const chartData = AXES.map((axis) => ({
    subject: axis.label,
    value: hasData ? ((avaliacao as any)[axis.key] ?? 0) : 0,
    fullMark: 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Pulso de Vida
        </CardTitle>
        {avaliacao?.semana && (
          <p className="text-xs text-muted-foreground">
            Última avaliação: {new Date(avaliacao.semana + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : !hasData ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma avaliação registrada ainda.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 10]}
                tickCount={6}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="Pulso de Vida"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.4}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
