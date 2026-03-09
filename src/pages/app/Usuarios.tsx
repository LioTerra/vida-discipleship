import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import MentoriasTab from "@/components/admin/MentoriasTab";

type Profile = Tables<"profiles">;

const Usuarios = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  if (profile?.role !== "admin") {
    return <Navigate to="/app/inicio" replace />;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const isSelf = (id: string) => id === profile?.id;

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({ title: "Usuário atualizado" });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: role as Profile["role"] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast({ title: "Role atualizado" });
    },
  });

  const handleToggleAtivo = (id: string, ativo: boolean) => {
    if (isSelf(id)) {
      toast({ title: "Você não pode alterar sua própria conta.", variant: "destructive" });
      return;
    }
    toggleAtivo.mutate({ id, ativo });
  };

  const handleChangeRole = (id: string, role: string) => {
    if (isSelf(id)) {
      toast({ title: "Você não pode alterar sua própria conta.", variant: "destructive" });
      return;
    }
    changeRole.mutate({ id, role });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Gestão de Usuários</h1>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="mentorias">Mentorias</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : (
                  users?.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role ?? "user"}
                          onValueChange={(role) => changeRole.mutate({ id: u.id, role })}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={u.ativo ?? false}
                          onCheckedChange={(ativo) => toggleAtivo.mutate({ id: u.id, ativo })}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="mentorias" className="mt-4">
          <MentoriasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Usuarios;
