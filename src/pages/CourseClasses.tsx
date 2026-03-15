import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { useCourses, useCourseClasses } from "@/hooks/useCourses";
import { Plus, Search, Calendar, MapPin, Monitor, Blend, Users, Trash2, Edit, Copy, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Aberta", variant: "default" },
  full: { label: "Lotada", variant: "destructive" },
  closed: { label: "Encerrada", variant: "secondary" },
  cancelled: { label: "Cancelada", variant: "outline" },
};

const emptyClass = {
  course_id: "",
  name: "",
  class_date: "",
  start_time: "09:00",
  end_time: "17:00",
  location: "",
  modality: "presencial",
  online_link: "",
  max_students: 10,
  instructor_name: "",
  notes: "",
  status: "open",
};

const CourseClasses = () => {
  const { courses } = useCourses();
  const { classes, createClass, updateClass, deleteClass } = useCourseClasses();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyClass);

  const handleOpen = (cls?: any) => {
    if (cls) {
      setEditing(cls);
      setForm({
        course_id: cls.course_id,
        name: cls.name || "",
        class_date: cls.class_date || "",
        start_time: cls.start_time || "09:00",
        end_time: cls.end_time || "17:00",
        location: cls.location || "",
        modality: cls.modality || "presencial",
        online_link: cls.online_link || "",
        max_students: cls.max_students || 10,
        instructor_name: cls.instructor_name || "",
        notes: cls.notes || "",
        status: cls.status || "open",
      });
    } else {
      setEditing(null);
      setForm(emptyClass);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.course_id || !form.class_date) return;
    if (editing) {
      updateClass.mutate({ id: editing.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createClass.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleClone = (cls: any) => {
    const { id, professional_id, created_at, updated_at, enrolled_count, courses: _, ...rest } = cls;
    createClass.mutate({ ...rest, name: `${rest.name} (cópia)`, status: "open" });
  };

  const filtered = (classes.data || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === "all" || c.course_id === courseFilter;
    return matchSearch && matchCourse;
  });

  return (
    <DashboardLayout title="Turmas">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="text-primary" size={28} />
              Turmas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie as turmas dos seus cursos</p>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus size={16} /> Nova Turma
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar turma..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por curso" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {(courses.data || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {classes.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma turma encontrada</h3>
              <p className="text-muted-foreground text-sm mb-4">Crie turmas para seus cursos</p>
              <Button onClick={() => handleOpen()} className="gap-2"><Plus size={16} /> Criar Turma</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cls: any) => {
              const sc = statusConfig[cls.status] || statusConfig.open;
              const occupancy = cls.max_students > 0 ? Math.round((cls.enrolled_count / cls.max_students) * 100) : 0;
              const remaining = cls.max_students - cls.enrolled_count;
              const isAlmostFull = remaining > 0 && remaining <= 3;
              return (
                <Card key={cls.id} className="hover:shadow-lg transition-all duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-medium text-primary uppercase tracking-wide">{cls.courses?.name}</p>
                        <CardTitle className="text-base mt-1">{cls.name}</CardTitle>
                      </div>
                      <Badge variant={sc.variant} className="text-[10px] shrink-0">{sc.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {cls.class_date ? format(new Date(cls.class_date + "T12:00:00"), "dd MMM yyyy", { locale: ptBR }) : "—"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {cls.start_time?.slice(0, 5)} - {cls.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {cls.modality === "online" ? <Monitor size={12} /> : cls.modality === "hybrid" ? <Blend size={12} /> : <MapPin size={12} />}
                      <span>{cls.location || (cls.modality === "online" ? "Online" : "—")}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Users size={12} /> Ocupação</span>
                        <span className="font-medium">{cls.enrolled_count}/{cls.max_students}</span>
                      </div>
                      <Progress value={occupancy} className="h-2" />
                      {isAlmostFull && <p className="text-[10px] text-warning font-medium">⚡ Últimas {remaining} vaga{remaining > 1 ? "s" : ""}!</p>}
                    </div>

                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(cls)}><Edit size={14} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClone(cls)}><Copy size={14} /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir turma?</AlertDialogTitle>
                            <AlertDialogDescription>Todas as inscrições desta turma serão removidas.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteClass.mutate(cls.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Turma" : "Nova Turma"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Curso *</Label>
              <Select value={form.course_id} onValueChange={(v) => setForm(p => ({ ...p, course_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>
                  {(courses.data || []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome da turma *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Turma Manhã - Janeiro" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.class_date} onChange={(e) => setForm(p => ({ ...p, class_date: e.target.value }))} />
              </div>
              <div>
                <Label>Início</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>Término</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Modalidade</Label>
                <Select value={form.modality} onValueChange={(v) => setForm(p => ({ ...p, modality: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vagas</Label>
                <Input type="number" min={1} value={form.max_students} onChange={(e) => setForm(p => ({ ...p, max_students: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Local</Label>
              <Input value={form.location} onChange={(e) => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Endereço ou local" />
            </div>
            {(form.modality === "online" || form.modality === "hybrid") && (
              <div>
                <Label>Link da aula</Label>
                <Input value={form.online_link} onChange={(e) => setForm(p => ({ ...p, online_link: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            <div>
              <Label>Instrutora</Label>
              <Input value={form.instructor_name} onChange={(e) => setForm(p => ({ ...p, instructor_name: e.target.value }))} placeholder="Nome da instrutora" />
            </div>
            <div>
              <Label>Observações internas</Label>
              <Textarea value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createClass.isPending || updateClass.isPending}>
                {createClass.isPending || updateClass.isPending ? "Salvando..." : editing ? "Salvar" : "Criar Turma"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CourseClasses;
