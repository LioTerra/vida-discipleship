import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calendar, Heart, GraduationCap, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { usePendingUsers } from "@/hooks/usePendingUsers";

const Inicio = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = profile?.role === "admin";
  const pendingCount = usePendingUsers();

  // 1. Aulas concluídas pelo usuário logado
  const { data: aulasCount } = useQuery({
    queryKey: ["progresso-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("progresso")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("concluido", true);
      return count ?? 0;
    },
    enabled: !!user,
  });

  // 2. Semanas de discipulado (mentorship ativa do usuário)
  const { data: activeMentorship } = useQuery({
    queryKey: ["active-mentorship", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mentorships")
        .select("id, started_at")
        .or(`mentor_id.eq.${user!.id},mentee_id.eq.${user!.id}`)
        .eq("status", "ativo")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const mentorshipWeeks = activeMentorship?.started_at
    ? Math.floor((Date.now() - new Date(activeMentorship.started_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0;

  // 3. Próxima avaliação
  const { data: nextEvalLabel } = useQuery({
    queryKey: ["next-eval", activeMentorship?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("avaliacoes")
        .select("semana")
        .eq("mentorship_id", activeMentorship!.id)
        .order("semana", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data?.semana) return "Esta semana";

      const lastDate = new Date(data.semana + "T00:00:00");
      lastDate.setDate(lastDate.getDate() + 7);
      return `${lastDate.getDate().toString().padStart(2, "0")}/${(lastDate.getMonth() + 1).toString().padStart(2, "0")}`;
    },
    enabled: !!activeMentorship?.id,
  });

  // 4. Cursos em andamento
  const { data: cursosEmAndamento } = useQuery({
    queryKey: ["cursos-em-andamento", user?.id],
    queryFn: async () => {
      // Get all user's completed aulas
      const { data: userProgress } = await supabase
        .from("progresso")
        .select("aula_id")
        .eq("user_id", user!.id)
        .eq("concluido", true);

      if (!userProgress?.length) return 0;

      const completedAulaIds = new Set(userProgress.map((p) => p.aula_id));

      // Get all aulas with their curso via modulo
      const { data: aulas } = await supabase
        .from("aulas")
        .select("id, modulo_id");

      const { data: modulos } = await supabase
        .from("modulos")
        .select("id, curso_id");

      if (!aulas || !modulos) return 0;

      const moduloToCurso: Record<string, string> = {};
      modulos.forEach((m) => { moduloToCurso[m.id] = m.curso_id; });

      // Group aulas by curso
      const cursoAulas: Record<string, { total: number; done: number }> = {};
      aulas.forEach((a) => {
        const cursoId = moduloToCurso[a.modulo_id];
        if (!cursoId) return;
        if (!cursoAulas[cursoId]) cursoAulas[cursoId] = { total: 0, done: 0 };
        cursoAulas[cursoId].total++;
        if (completedAulaIds.has(a.id)) cursoAulas[cursoId].done++;
      });

      // Count cursos with at least 1 done but not all
      return Object.values(cursoAulas).filter((c) => c.done > 0 && c.done < c.total).length;
    },
    enabled: !!user,
  });

  const stats = [
    { title: "Aulas Concluídas", value: aulasCount ?? 0, icon: BookOpen },
    { title: "Semanas de Discipulado", value: mentorshipWeeks, icon: Heart },
    { title: "Próxima Avaliação", value: activeMentorship ? (nextEvalLabel ?? "—") : "—", icon: Calendar },
    { title: "Cursos em Andamento", value: cursosEmAndamento ?? 0, icon: GraduationCap },
  ];

  return (
    <div className="space-y-6">
      {isAdmin && !!pendingCount && pendingCount > 0 && (
        <Alert className="border-primary/50 bg-primary/10">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{pendingCount} pessoa(s) aguardando liberação de acesso.</span>
            <Button size="sm" variant="outline" onClick={() => navigate("/app/usuarios")}>
              Ver pendentes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div>
        <h1 className="text-2xl font-bold">
          Olá, {profile?.nome?.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground">Bem-vindo ao Ministério Vida</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
