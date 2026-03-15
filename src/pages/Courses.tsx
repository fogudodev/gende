import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCourses } from "@/hooks/useCourses";
import { Plus, Search, BookOpen, Users, DollarSign, Clock, Edit, Trash2, Copy, Archive, Eye, GraduationCap, MapPin, Monitor, Blend } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const modalityIcon = (mod: string) => {
  if (mod === "online") return <Monitor size={14} />;
  if (mod === "hybrid") return <Blend size={14} />;
  return <MapPin size={14} />;
};

const modalityLabel = (mod: string) => {
  if (mod === "online") return "Online";
  if (mod === "hybrid") return "Híbrido";
  return "Presencial";
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "destructive" },
  archived: { label: "Arquivado", variant: "outline" },
};

const emptyCourse = {
  name: "",
  short_description: "",
  full_description: "",
  workload_hours: 8,
  modality: "presencial",
  price: 0,
  installments: 1,
  max_students: 10,
  syllabus: "",
  materials_included: "",
  prerequisites: "",
  has_certificate: true,
  status: "draft",
};

const Courses = () => {
  const { courses, createCourse, updateCourse, deleteCourse } = useCourses();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [form, setForm] = useState(emptyCourse);

  const handleOpen = (course?: any) => {
    if (course) {
      setEditingCourse(course);
      setForm({
        name: course.name || "",
        short_description: course.short_description || "",
        full_description: course.full_description || "",
        workload_hours: course.workload_hours || 8,
        modality: course.modality || "presencial",
        price: course.price || 0,
        installments: course.installments || 1,
        max_students: course.max_students || 10,
        syllabus: course.syllabus || "",
        materials_included: course.materials_included || "",
        prerequisites: course.prerequisites || "",
        has_certificate: course.has_certificate ?? true,
        status: course.status || "draft",
      });
    } else {
      setEditingCourse(null);
      setForm(emptyCourse);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editingCourse) {
      updateCourse.mutate({ id: editingCourse.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createCourse.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const handleDuplicate = (course: any) => {
    const { id, professional_id, created_at, updated_at, course_categories, ...rest } = course;
    createCourse.mutate({ ...rest, name: `${rest.name} (cópia)`, status: "draft" });
  };

  const handleArchive = (course: any) => {
    updateCourse.mutate({ id: course.id, status: "archived" });
  };

  const filtered = (courses.data || []).filter((c: any) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: (courses.data || []).length,
    active: (courses.data || []).filter((c: any) => c.status === "active").length,
    draft: (courses.data || []).filter((c: any) => c.status === "draft").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <GraduationCap className="text-primary" size={28} />
              Cursos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie seus cursos e formações</p>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus size={16} /> Novo Curso
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-success">{stats.active}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-warning">{stats.draft}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar curso..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="draft">Rascunhos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="archived">Arquivados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Course List */}
        {courses.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GraduationCap size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum curso encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">Crie seu primeiro curso e comece a vender formações</p>
              <Button onClick={() => handleOpen()} className="gap-2"><Plus size={16} /> Criar Curso</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course: any) => {
              const sc = statusConfig[course.status] || statusConfig.draft;
              return (
                <Card key={course.id} className="group hover:shadow-lg transition-all duration-200 overflow-hidden">
                  {course.cover_image_url && (
                    <div className="h-36 bg-muted overflow-hidden">
                      <img src={course.cover_image_url} alt={course.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{course.name}</CardTitle>
                      <Badge variant={sc.variant} className="text-[10px] shrink-0">{sc.label}</Badge>
                    </div>
                    {course.short_description && (
                      <CardDescription className="line-clamp-2 text-xs">{course.short_description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">{modalityIcon(course.modality)} {modalityLabel(course.modality)}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {course.workload_hours}h</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {course.max_students} vagas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-primary">
                        R$ {Number(course.price).toFixed(2).replace(".", ",")}
                      </span>
                      {course.installments > 1 && (
                        <span className="text-[10px] text-muted-foreground">
                          até {course.installments}x
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 pt-1 border-t border-border">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(course)}>
                        <Edit size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(course)}>
                        <Copy size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleArchive(course)}>
                        <Archive size={14} />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 size={14} />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Todas as turmas e inscrições vinculadas serão removidas.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCourse.mutate(course.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
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

      {/* Course Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Editar Curso" : "Novo Curso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do curso *</Label>
              <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ex: Design de Sobrancelhas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição curta</Label>
              <Input value={form.short_description} onChange={(e) => setForm(p => ({ ...p, short_description: e.target.value }))} placeholder="Resumo atrativo do curso" />
            </div>
            <div>
              <Label>Descrição completa</Label>
              <Textarea value={form.full_description} onChange={(e) => setForm(p => ({ ...p, full_description: e.target.value }))} rows={4} placeholder="Descreva o curso em detalhes..." />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <Label>Carga horária</Label>
                <Input type="number" min={1} value={form.workload_hours} onChange={(e) => setForm(p => ({ ...p, workload_hours: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" min={0} step={0.01} value={form.price} onChange={(e) => setForm(p => ({ ...p, price: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Parcelas</Label>
                <Input type="number" min={1} max={12} value={form.installments} onChange={(e) => setForm(p => ({ ...p, installments: Number(e.target.value) }))} />
              </div>
              <div>
                <Label>Máx. alunos</Label>
                <Input type="number" min={1} value={form.max_students} onChange={(e) => setForm(p => ({ ...p, max_students: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Conteúdo programático</Label>
              <Textarea value={form.syllabus} onChange={(e) => setForm(p => ({ ...p, syllabus: e.target.value }))} rows={3} placeholder="Liste os tópicos do curso..." />
            </div>
            <div>
              <Label>Materiais inclusos</Label>
              <Input value={form.materials_included} onChange={(e) => setForm(p => ({ ...p, materials_included: e.target.value }))} placeholder="Ex: Kit prático, apostila..." />
            </div>
            <div>
              <Label>Pré-requisitos</Label>
              <Input value={form.prerequisites} onChange={(e) => setForm(p => ({ ...p, prerequisites: e.target.value }))} placeholder="Ex: Nenhum / Curso básico concluído" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.has_certificate} onCheckedChange={(v) => setForm(p => ({ ...p, has_certificate: v }))} />
              <Label>Certificado incluso</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createCourse.isPending || updateCourse.isPending}>
                {createCourse.isPending || updateCourse.isPending ? "Salvando..." : editingCourse ? "Salvar" : "Criar Curso"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Courses;
