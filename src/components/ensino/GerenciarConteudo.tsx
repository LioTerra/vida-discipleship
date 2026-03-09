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
import { ArrowLeft, Plus, Pencil, Trash2, Video, Headphones, FileText, GripVertical, Copy, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type Curso = Tables<"cursos">;
type Modulo = Tables<"modulos">;
type Aula = Tables<"aulas">;
type ContentType = Database["public"]["Enums"]["content_type"];

interface Props {
  onVoltar: () => void;
}

const tipoIcon: Record<ContentType, typeof Video> = { video: Video, audio: Headphones, texto: FileText };
const tipoLabel: Record<ContentType, string> = { video: "Vídeo", audio: "Áudio", texto: "Texto" };

// ── Sortable wrapper component ──
function SortableItem({ id, children, dragHandle }: { id: string; children: React.ReactNode; dragHandle?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 10 : undefined,
  };

  if (dragHandle) {
    return (
      <div ref={setNodeRef} style={style}>
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<any>, { dragListeners: listeners, dragAttributes: attributes })
            : child
        )}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

export default function GerenciarConteudo({ onVoltar }: Props) {
  const qc = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  // ── Reorder mutation ──
  const reorder = useMutation({
    mutationFn: async ({ table, items }: { table: "cursos" | "modulos" | "aulas"; items: { id: string; ordem: number }[] }) => {
      const promises = items.map(({ id, ordem }) =>
        supabase.from(table).update({ ordem }).eq("id", id)
      );
      const results = await Promise.all(promises);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => invalidateAll(),
    onError: () => toast({ title: "Erro ao reordenar", variant: "destructive" }),
  });

  // ── Toggle ativo mutation ──
  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("cursos").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast({ title: "Status do curso atualizado" }); },
    onError: () => toast({ title: "Erro ao atualizar status", variant: "destructive" }),
  });

  const handleDragEndCursos = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !cursos) return;
    const oldIndex = cursos.findIndex((c) => c.id === active.id);
    const newIndex = cursos.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(cursos, oldIndex, newIndex);
    // Optimistic update
    qc.setQueryData(["admin-cursos"], reordered);
    reorder.mutate({
      table: "cursos",
      items: reordered.map((c, i) => ({ id: c.id, ordem: i })),
    });
  };

  const handleDragEndModulos = (cursoId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !modulos) return;
    const items = modulosDoCurso(cursoId);
    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    // Optimistic: replace only the modulos for this curso
    const otherModulos = modulos.filter((m) => m.curso_id !== cursoId);
    qc.setQueryData(["admin-modulos"], [...otherModulos, ...reordered]);
    reorder.mutate({
      table: "modulos",
      items: reordered.map((m, i) => ({ id: m.id, ordem: i })),
    });
  };

  const handleDragEndAulas = (moduloId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !aulas) return;
    const items = aulasDoModulo(moduloId);
    const oldIndex = items.findIndex((a) => a.id === active.id);
    const newIndex = items.findIndex((a) => a.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    const otherAulas = aulas.filter((a) => a.modulo_id !== moduloId);
    qc.setQueryData(["admin-aulas"], [...otherAulas, ...reordered]);
    reorder.mutate({
      table: "aulas",
      items: reordered.map((a, i) => ({ id: a.id, ordem: i })),
    });
  };

  // ── Curso mutations ──
  const saveCurso = useMutation({
    mutationFn: async () => {
      if (cursoDialog.editing) {
        const { error } = await supabase.from("cursos").update({ titulo, descricao }).eq("id", cursoDialog.editing.id);
        if (error) throw error;
      } else {
        const nextOrdem = (cursos?.length ?? 0);
        const { error } = await supabase.from("cursos").insert({ titulo, descricao, ordem: nextOrdem });
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
        const nextOrdem = modulosDoCurso(moduloDialog.cursoId).length;
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
        const nextOrdem = aulasDoModulo(aulaDialog.moduloId).length;
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

  // ── Duplicate curso mutation ──
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const duplicateCurso = useMutation({
    mutationFn: async (cursoId: string) => {
      setDuplicatingId(cursoId);
      // Fetch original curso
      const { data: original, error: cErr } = await supabase.from("cursos").select("*").eq("id", cursoId).single();
      if (cErr) throw cErr;

      // Create copy
      const nextOrdem = (cursos?.length ?? 0);
      const { data: newCurso, error: ncErr } = await supabase.from("cursos").insert({
        titulo: `${original.titulo} (cópia)`,
        descricao: original.descricao,
        ativo: false,
        ordem: nextOrdem,
      }).select().single();
      if (ncErr) throw ncErr;

      // Fetch and copy módulos
      const { data: origModulos, error: mErr } = await supabase.from("modulos").select("*").eq("curso_id", cursoId).order("ordem");
      if (mErr) throw mErr;

      for (const mod of origModulos ?? []) {
        const { data: newMod, error: nmErr } = await supabase.from("modulos").insert({
          curso_id: newCurso.id,
          titulo: mod.titulo,
          descricao: mod.descricao,
          ordem: mod.ordem,
        }).select().single();
        if (nmErr) throw nmErr;

        // Fetch and copy aulas for this módulo
        const { data: origAulas, error: aErr } = await supabase.from("aulas").select("*").eq("modulo_id", mod.id).order("ordem");
        if (aErr) throw aErr;

        if (origAulas?.length) {
          const { error: naErr } = await supabase.from("aulas").insert(
            origAulas.map((a) => ({
              modulo_id: newMod.id,
              titulo: a.titulo,
              tipo: a.tipo,
              url: a.url,
              conteudo_texto: a.conteudo_texto,
              duracao_min: a.duracao_min,
              ordem: a.ordem,
            }))
          );
          if (naErr) throw naErr;
        }
      }
    },
    onSuccess: () => {
      setDuplicatingId(null);
      invalidateAll();
      toast({ title: "Curso duplicado com sucesso!" });
    },
    onError: () => {
      setDuplicatingId(null);
      toast({ title: "Erro ao duplicar curso", variant: "destructive" });
    },
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
          <p className="text-muted-foreground">Cursos, módulos e aulas — arraste para reordenar</p>
        </div>
      </div>

      {/* New curso button */}
      <Button onClick={() => openCursoDialog()} className="gap-2">
        <Plus className="h-4 w-4" /> Novo Curso
      </Button>

      {/* Cursos list with drag-and-drop */}
      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : !cursos?.length ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum curso criado.</CardContent></Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCursos}>
          <SortableContext items={cursos.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {cursos.map((curso) => (
                <SortableCursoCard
                  key={curso.id}
                  curso={curso}
                  modulosDoCurso={modulosDoCurso}
                  aulasDoModulo={aulasDoModulo}
                  sensors={sensors}
                  onEditCurso={openCursoDialog}
                  onDeleteCurso={(c) => setDeleteDialog({ open: true, type: "curso", id: c.id, name: c.titulo })}
                  onDuplicateCurso={(c) => duplicateCurso.mutate(c.id)}
                  duplicatingId={duplicatingId}
                  onAddModulo={(cursoId) => openModuloDialog(cursoId)}
                  onEditModulo={openModuloDialog}
                  onDeleteModulo={(m) => setDeleteDialog({ open: true, type: "modulo", id: m.id, name: m.titulo })}
                  onAddAula={(moduloId) => openAulaDialog(moduloId)}
                  onEditAula={openAulaDialog}
                  onDeleteAula={(a) => setDeleteDialog({ open: true, type: "aula", id: a.id, name: a.titulo })}
                  onToggleAtivo={(id, ativo) => toggleAtivo.mutate({ id, ativo })}
                  onDragEndModulos={handleDragEndModulos(curso.id)}
                  onDragEndAulas={handleDragEndAulas}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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

// ── Sortable Curso Card ──
interface SortableCursoCardProps {
  curso: Curso;
  modulosDoCurso: (id: string) => Modulo[];
  aulasDoModulo: (id: string) => Aula[];
  sensors: ReturnType<typeof useSensors>;
  onEditCurso: (c: Curso) => void;
  onDeleteCurso: (c: Curso) => void;
  onToggleAtivo: (id: string, ativo: boolean) => void;
  onAddModulo: (cursoId: string) => void;
  onEditModulo: (cursoId: string, m: Modulo) => void;
  onDeleteModulo: (m: Modulo) => void;
  onAddAula: (moduloId: string) => void;
  onEditAula: (moduloId: string, a: Aula) => void;
  onDeleteAula: (a: Aula) => void;
  onDragEndModulos: (e: DragEndEvent) => void;
  onDragEndAulas: (moduloId: string) => (e: DragEndEvent) => void;
}

function SortableCursoCard({
  curso, modulosDoCurso, aulasDoModulo, sensors,
  onEditCurso, onDeleteCurso, onToggleAtivo, onAddModulo, onEditModulo, onDeleteModulo,
  onAddAula, onEditAula, onDeleteAula, onDragEndModulos, onDragEndAulas,
}: SortableCursoCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: curso.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const mods = modulosDoCurso(curso.id);

  return (
    <Card ref={setNodeRef} style={style}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
            <CardTitle className="text-lg">{curso.titulo}</CardTitle>
            {!curso.ativo && <Badge variant="secondary">Inativo</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={curso.ativo ?? false}
              onCheckedChange={(ativo) => onToggleAtivo(curso.id, ativo)}
            />
            <Button variant="ghost" size="icon" onClick={() => onEditCurso(curso)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDeleteCurso(curso)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {curso.descricao && <p className="text-sm text-muted-foreground ml-7">{curso.descricao}</p>}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Módulos</span>
          <Button variant="outline" size="sm" onClick={() => onAddModulo(curso.id)} className="gap-1">
            <Plus className="h-3 w-3" /> Módulo
          </Button>
        </div>

        {mods.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Nenhum módulo.</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndModulos}>
            <SortableContext items={mods.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <Accordion type="multiple" className="space-y-2">
                {mods.map((modulo) => (
                  <SortableModuloItem
                    key={modulo.id}
                    modulo={modulo}
                    cursoId={curso.id}
                    aulasDoModulo={aulasDoModulo}
                    sensors={sensors}
                    onEditModulo={onEditModulo}
                    onDeleteModulo={onDeleteModulo}
                    onAddAula={onAddAula}
                    onEditAula={onEditAula}
                    onDeleteAula={onDeleteAula}
                    onDragEndAulas={onDragEndAulas(modulo.id)}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sortable Modulo Item ──
interface SortableModuloItemProps {
  modulo: Modulo;
  cursoId: string;
  aulasDoModulo: (id: string) => Aula[];
  sensors: ReturnType<typeof useSensors>;
  onEditModulo: (cursoId: string, m: Modulo) => void;
  onDeleteModulo: (m: Modulo) => void;
  onAddAula: (moduloId: string) => void;
  onEditAula: (moduloId: string, a: Aula) => void;
  onDeleteAula: (a: Aula) => void;
  onDragEndAulas: (e: DragEndEvent) => void;
}

function SortableModuloItem({
  modulo, cursoId, aulasDoModulo, sensors,
  onEditModulo, onDeleteModulo, onAddAula, onEditAula, onDeleteAula, onDragEndAulas,
}: SortableModuloItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: modulo.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const aulasList = aulasDoModulo(modulo.id);

  return (
    <AccordionItem ref={setNodeRef} style={style} value={modulo.id} className="border border-border rounded-lg px-3">
      <div className="flex items-center">
        <button
          className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors mr-1 shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <AccordionTrigger className="hover:no-underline py-2 flex-1">
          <div className="flex items-center gap-2 text-left flex-1 mr-2">
            <span className="text-sm font-medium">{modulo.titulo}</span>
            <Badge variant="outline" className="text-xs">{aulasList.length} aulas</Badge>
          </div>
        </AccordionTrigger>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEditModulo(cursoId, modulo); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onDeleteModulo(modulo); }}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
      <AccordionContent>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEndAulas}>
          <SortableContext items={aulasList.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1 pb-2">
              {aulasList.map((aula) => (
                <SortableAulaItem
                  key={aula.id}
                  aula={aula}
                  moduloId={modulo.id}
                  onEditAula={onEditAula}
                  onDeleteAula={onDeleteAula}
                />
              ))}
              <Button variant="ghost" size="sm" className="gap-1 mt-1 text-muted-foreground" onClick={() => onAddAula(modulo.id)}>
                <Plus className="h-3 w-3" /> Adicionar aula
              </Button>
            </div>
          </SortableContext>
        </DndContext>
      </AccordionContent>
    </AccordionItem>
  );
}

// ── Sortable Aula Item ──
function SortableAulaItem({
  aula, moduloId, onEditAula, onDeleteAula,
}: {
  aula: Aula; moduloId: string;
  onEditAula: (moduloId: string, a: Aula) => void;
  onDeleteAula: (a: Aula) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: aula.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const Icon = tipoIcon[aula.tipo];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-secondary/50 transition-colors group"
    >
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm flex-1">{aula.titulo}</span>
      <Badge variant="outline" className="text-xs">{tipoLabel[aula.tipo]}</Badge>
      {aula.duracao_min && <span className="text-xs text-muted-foreground">{aula.duracao_min}min</span>}
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onEditAula(moduloId, aula)}>
        <Pencil className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => onDeleteAula(aula)}>
        <Trash2 className="h-3 w-3 text-destructive" />
      </Button>
    </div>
  );
}
