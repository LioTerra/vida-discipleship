import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Pencil, Trash2, Video, Headphones, FileText } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type Curso = Tables<"cursos">;
type Modulo = Tables<"modulos">;
type Aula = Tables<"aulas">;
type ContentType = Database["public"]["Enums"]["content_type"];

interface Props {
  onVoltar: () => void;
}

const tipoIcon: Record<ContentType, typeof Video> = { video: Video, audio: Headphones, texto: FileText };
const tipoLabel: Record<ContentType, string> = { video: "Vídeo", audio: "Áudio", texto: "Texto" };

export default function GerenciarConteudo({ onVoltar }: Props) {
  const qc = useQueryClient();

  // ── State for dialogs ──
  const [cursoDialog, setCursoDialog] = useState<{ open: boolean; editing?: Curso }>({ open: false });
  const [moduloDialog, setModuloDialog] = useState<{ open: boolean; cursoId: string; editing?: Modulo }>({ open: false, cursoId: "" });
  const [aulaDialog, setAulaDialog] = useState<{ open: boolean; moduloId: string; editing?: Aula }>({ open: false, moduloId: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string }>({ open: false, type: "", id: "", name: "" });

  // ── Form state ──
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<ContentType>("video");
  const [url, setUrl] = useState("");
  const [conteudoTexto, setConteudoTexto] = useState("");
  const [duracaoMin, setDuracaoMin] = useState("");

  // ── Queries ──
  const { data: cursos, isLoading } = useQuery({
    queryKey: ["admin-cursos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cursos").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: modulos } = useQuery({
    queryKey: ["admin-modulos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("modulos").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const { data: aulas } = useQuery({
    queryKey: ["admin-aulas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("aulas").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });

  // ── Helpers ──
  const modulosDoCurso = (cursoId: string) => modulos?.filter((m) => m.curso_id === cursoId) ?? [];
  const aulasDoModulo = (moduloId: string) => aulas?.filter((a) => a.modulo_id === moduloId) ?? [];

  const resetForm = () => {
    setTitulo(""); setDescricao(""); setTipo("video"); setUrl(""); setConteudoTexto(""); setDuracaoMin("");
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-cursos"] });
    qc.invalidateQueries({ queryKey: ["admin-modulos"] });
    qc.invalidateQueries({ queryKey: ["admin-aulas"] });
    qc.invalidateQueries({ queryKey: ["cursos"] });
    qc.invalidateQueries({ queryKey: ["modulos"] });
    qc.invalidateQueries({ queryKey: ["aulas"] });
    qc.invalidateQueries({ queryKey: ["aulas-por-curso"] });
  };

  // ── Curso mutations ──
  const saveCurso = useMutation({
    mutationFn: async () => {
      if (cursoDialog.editing) {
        const { error } = await supabase.from("cursos").update({ titulo, descricao }).eq("id", cursoDialog.editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cursos").insert({ titulo, descricao });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setCursoDialog({ open: false }); resetForm(); toast({ title: cursoDialog.editing ? "Curso atualizado" : "Curso criado" }); },
    onError: () => toast({ title: "Erro ao salvar curso", variant: "destructive" }),
  });

  // ── Modulo mutations ──
  const saveModulo = useMutation({
    mutationFn: async () => {
      if (moduloDialog.editing) {
        const { error } = await supabase.from("modulos").update({ titulo, descricao }).eq("id", moduloDialog.editing.id);
        if (error) throw error;
      } else {
        const nextOrdem = (modulosDoCurso(moduloDialog.cursoId).length) + 1;
        const { error } = await supabase.from("modulos").insert({ titulo, descricao, curso_id: moduloDialog.cursoId, ordem: nextOrdem });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setModuloDialog({ open: false, cursoId: "" }); resetForm(); toast({ title: moduloDialog.editing ? "Módulo atualizado" : "Módulo criado" }); },
    onError: () => toast({ title: "Erro ao salvar módulo", variant: "destructive" }),
  });

  // ── Aula mutations ──
  const saveAula = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo,
        tipo,
        url: tipo !== "texto" ? url || null : null,
        conteudo_texto: tipo === "texto" ? conteudoTexto || null : null,
        duracao_min: duracaoMin ? parseInt(duracaoMin) : null,
      };
      if (aulaDialog.editing) {
        const { error } = await supabase.from("aulas").update(payload).eq("id", aulaDialog.editing.id);
        if (error) throw error;
      } else {
        const nextOrdem = (aulasDoModulo(aulaDialog.moduloId).length) + 1;
        const { error } = await supabase.from("aulas").insert({ ...payload, modulo_id: aulaDialog.moduloId, ordem: nextOrdem });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidateAll(); setAulaDialog({ open: false, moduloId: "" }); resetForm(); toast({ title: aulaDialog.editing ? "Aula atualizada" : "Aula criada" }); },
    onError: () => toast({ title: "Erro ao salvar aula", variant: "destructive" }),
  });

  // ── Delete mutation ──
  const deleteItem = useMutation({
    mutationFn: async () => {
      const { type, id } = deleteDialog;
      const table = type === "curso" ? "cursos" : type === "modulo" ? "modulos" : "aulas";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setDeleteDialog({ open: false, type: "", id: "", name: "" }); toast({ title: "Item excluído" }); },
    onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
  });

  // ── Open dialogs with pre-fill ──
  const openCursoDialog = (curso?: Curso) => {
    resetForm();
    if (curso) { setTitulo(curso.titulo); setDescricao(curso.descricao ?? ""); }
    setCursoDialog({ open: true, editing: curso });
  };

  const openModuloDialog = (cursoId: string, modulo?: Modulo) => {
    resetForm();
    if (modulo) { setTitulo(modulo.titulo); setDescricao(modulo.descricao ?? ""); }
    setModuloDialog({ open: true, cursoId, editing: modulo });
  };

  const openAulaDialog = (moduloId: string, aula?: Aula) => {
    resetForm();
    if (aula) {
      setTitulo(aula.titulo);
      setTipo(aula.tipo);
      setUrl(aula.url ?? "");
      setConteudoTexto(aula.conteudo_texto ?? "");
      setDuracaoMin(aula.duracao_min?.toString() ?? "");
    }
    setAulaDialog({ open: true, moduloId, editing: aula });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gerenciar Conteúdo</h1>
          <p className="text-muted-foreground">Cursos, módulos e aulas</p>
        </div>
      </div>

      {/* New curso button */}
      <Button onClick={() => openCursoDialog()} className="gap-2">
        <Plus className="h-4 w-4" /> Novo Curso
      </Button>

      {/* Cursos list */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !cursos?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum curso criado.</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {cursos.map((curso) => (
            <Card key={curso.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{curso.titulo}</CardTitle>
                    {!curso.ativo && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openCursoDialog(curso)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteDialog({ open: true, type: "curso", id: curso.id, name: curso.titulo })}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {curso.descricao && <p className="text-sm text-muted-foreground">{curso.descricao}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">Módulos</span>
                  <Button variant="outline" size="sm" onClick={() => openModuloDialog(curso.id)} className="gap-1">
                    <Plus className="h-3 w-3" /> Módulo
                  </Button>
                </div>

                {modulosDoCurso(curso.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Nenhum módulo.</p>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {modulosDoCurso(curso.id).map((modulo) => (
                      <AccordionItem key={modulo.id} value={modulo.id} className="border border-border rounded-lg px-3">
                        <AccordionTrigger className="hover:no-underline py-2">
                          <div className="flex items-center gap-2 text-left flex-1 mr-2">
                            <span className="text-sm font-medium">{modulo.titulo}</span>
                            <Badge variant="outline" className="text-xs">{aulasDoModulo(modulo.id).length} aulas</Badge>
                          </div>
                        </AccordionTrigger>
                        <div className="flex gap-1 absolute right-10 top-1/2 -translate-y-1/2" style={{ position: "relative", marginTop: "-2rem", marginBottom: "-0.5rem", justifyContent: "flex-end" }}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModuloDialog(curso.id, modulo)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteDialog({ open: true, type: "modulo", id: modulo.id, name: modulo.titulo })}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        <AccordionContent>
                          <div className="space-y-1 pb-2">
                            {aulasDoModulo(modulo.id).map((aula) => {
                              const Icon = tipoIcon[aula.tipo];
                              return (
                                <div key={aula.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors group">
                                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-sm flex-1">{aula.titulo}</span>
                                  <Badge variant="outline" className="text-xs">{tipoLabel[aula.tipo]}</Badge>
                                  {aula.duracao_min && <span className="text-xs text-muted-foreground">{aula.duracao_min}min</span>}
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openAulaDialog(modulo.id, aula)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => setDeleteDialog({ open: true, type: "aula", id: aula.id, name: aula.titulo })}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              );
                            })}
                            <Button variant="ghost" size="sm" className="gap-1 mt-1 text-muted-foreground" onClick={() => openAulaDialog(modulo.id)}>
                              <Plus className="h-3 w-3" /> Adicionar aula
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Curso Dialog ── */}
      <Dialog open={cursoDialog.open} onOpenChange={(open) => { if (!open) setCursoDialog({ open: false }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{cursoDialog.editing ? "Editar Curso" : "Novo Curso"}</DialogTitle>
            <DialogDescription>Preencha os dados do curso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => saveCurso.mutate()} disabled={!titulo.trim() || saveCurso.isPending}>
              {saveCurso.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modulo Dialog ── */}
      <Dialog open={moduloDialog.open} onOpenChange={(open) => { if (!open) setModuloDialog({ open: false, cursoId: "" }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moduloDialog.editing ? "Editar Módulo" : "Novo Módulo"}</DialogTitle>
            <DialogDescription>Preencha os dados do módulo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Textarea placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => saveModulo.mutate()} disabled={!titulo.trim() || saveModulo.isPending}>
              {saveModulo.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Aula Dialog ── */}
      <Dialog open={aulaDialog.open} onOpenChange={(open) => { if (!open) setAulaDialog({ open: false, moduloId: "" }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aulaDialog.editing ? "Editar Aula" : "Nova Aula"}</DialogTitle>
            <DialogDescription>Preencha os dados da aula.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            <Select value={tipo} onValueChange={(v) => setTipo(v as ContentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="audio">Áudio</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
              </SelectContent>
            </Select>
            {tipo !== "texto" ? (
              <Input placeholder="URL do conteúdo" value={url} onChange={(e) => setUrl(e.target.value)} />
            ) : (
              <Textarea placeholder="Conteúdo em texto" value={conteudoTexto} onChange={(e) => setConteudoTexto(e.target.value)} rows={5} />
            )}
            <Input placeholder="Duração em minutos (opcional)" type="number" value={duracaoMin} onChange={(e) => setDuracaoMin(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => saveAula.mutate()} disabled={!titulo.trim() || saveAula.isPending}>
              {saveAula.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => { if (!open) setDeleteDialog({ open: false, type: "", id: "", name: "" }); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteDialog.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: "", id: "", name: "" })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteItem.mutate()} disabled={deleteItem.isPending}>
              {deleteItem.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
