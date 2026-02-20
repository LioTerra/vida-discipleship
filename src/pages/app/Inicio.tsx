import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Inicio = () => {
  const { profile } = useAuth();

  const { data: aulasCount } = useQuery({
    queryKey: ["progresso-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("progresso")
        .select("*", { count: "exact", head: true })
        .eq("concluido", true);
      return count ?? 0;
    },
  });

  const { data: mentorshipWeeks } = useQuery({
    queryKey: ["mentorship-weeks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentorships")
        .select("started_at")
        .eq("status", "ativo")
        .limit(1);
      if (!data?.length || !data[0].started_at) return 0;
      const weeks = Math.floor(
        (Date.now() - new Date(data[0].started_at).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      return weeks;
    },
  });

  const stats = [
    { title: "Aulas Concluídas", value: aulasCount ?? 0, icon: BookOpen },
    { title: "Semanas de Discipulado", value: mentorshipWeeks ?? 0, icon: Heart },
    { title: "Próxima Avaliação", value: "—", icon: Calendar },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.nome?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">Bem-vindo ao Ministério Vida</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Inicio;
