import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Ensino = () => {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ensino</h1>
        <p className="text-muted-foreground">Cursos disponíveis para você</p>
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
          {cursos.map((curso) => (
            <Card key={curso.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                {curso.descricao && (
                  <CardDescription>{curso.descricao}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">0% concluído</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Ensino;
