import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-500/20 text-emerald-400",
  pausado: "bg-yellow-500/20 text-yellow-400",
  concluido: "bg-muted text-muted-foreground",
};

export default function MentoriasTab() {
  const queryClient = useQueryClient();
  const [mentorId, setMentorId] = useState("");
  const [menteeId, setMenteeId] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles-mentorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, role, ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: mentorships, isLoading } = useQuery({
    queryKey: ["all-mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*, mentor:profiles!mentorships_mentor_id_fkey(nome), mentee:profiles!mentorships_mentee_id_fkey(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const mentors = profiles?.filter((p) => p.role === "admin" || p.role === "staff") ?? [];
  const mentees = profiles?.filter((p) => p.role === "user") ?? [];

  const createMentorship = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("mentorships").insert({
        mentor_id: mentorId,
        mentee_id: menteeId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-mentorships"] });
      toast({ title: "Mentoria criada com sucesso" });
      setMentorId("");
      setMenteeId("");
    },
    onError: () => toast({ title: "Erro ao criar mentoria", variant: "destructive" }),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("mentorships")
        .update({ status: status as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-mentorships"] });
      toast({ title: "Status atualizado" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Create new mentorship */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Mentoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={mentorId} onValueChange={setMentorId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar mentor" />
              </SelectTrigger>
              <SelectContent>
                {mentors.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} ({p.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={menteeId} onValueChange={setMenteeId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecionar discípulo" />
              </SelectTrigger>
              <SelectContent>
                {mentees.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={() => createMentorship.mutate()}
              disabled={!mentorId || !menteeId || createMentorship.isPending}
              className="gap-2"
            >
              <Plus className="h-4 w-4" /> Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mentorships table */}
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mentor</TableHead>
              <TableHead>Discípulo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Início</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : !mentorships?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma mentoria encontrada.
                </TableCell>
              </TableRow>
            ) : (
              mentorships.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{(m.mentor as any)?.nome}</TableCell>
                  <TableCell>{(m.mentee as any)?.nome}</TableCell>
                  <TableCell>
                    <Select
                      value={m.status ?? "ativo"}
                      onValueChange={(status) => changeStatus.mutate({ id: m.id, status })}
                    >
                      <SelectTrigger className="w-32">
                        <Badge className={statusColors[m.status ?? "ativo"] + " border-0"}>
                          {m.status === "ativo" ? "Ativo" : m.status === "pausado" ? "Pausado" : "Concluído"}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="pausado">Pausado</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.started_at ? new Date(m.started_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
