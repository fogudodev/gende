import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCourses, useCourseClasses, useCourseEnrollments } from "@/hooks/useCourses";
import { Plus, Search, Users, UserPlus, Download, CheckCircle, XCircle, Clock, DollarSign, Edit } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const enrollmentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  confirmed: { label: "Confirmada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  waitlist: { label: "Lista de Espera", variant: "secondary" },
};

const paymentStatusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  overdue: { label: "Vencido", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

const emptyEnrollment = {
  course_id: "",
  class_id: "",
  student_name: "",
  student_phone: "",
  student_email: "",
  student_cpf: "",
  student_city: "",
  student_notes: "",
  enrollment_status: "confirmed",
  payment_status: "pending",
  payment_method: "",
  amount_paid: 0,
  origin: "manual",
};

const CourseStudents = () => {
  const { courses } = useCourses();
  const { classes } = useCourseClasses();
  const { enrollments, createEnrollment, updateEnrollment } = useCourseEnrollments();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyEnrollment);

  const handleOpen = (enrollment?: any) => {
    if (enrollment) {
      setEditing(enrollment);
      setForm({
        course_id: enrollment.course_id,
        class_id: enrollment.class_id,
        student_name: enrollment.student_name || "",
        student_phone: enrollment.student_phone || "",
        student_email: enrollment.student_email || "",
        student_cpf: enrollment.student_cpf || "",
        student_city: enrollment.student_city || "",
        student_notes: enrollment.student_notes || "",
        enrollment_status: enrollment.enrollment_status || "confirmed",
        payment_status: enrollment.payment_status || "pending",
        payment_method: enrollment.payment_method || "",
        amount_paid: enrollment.amount_paid || 0,
        origin: enrollment.origin || "manual",
      });
    } else {
      setEditing(null);
      setForm(emptyEnrollment);
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.student_name.trim() || !form.class_id || !form.course_id) return;
    if (editing) {
      updateEnrollment.mutate({ id: editing.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createEnrollment.mutate(form, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const filtered = (enrollments.data || []).filter((e: any) => {
    const matchSearch = e.student_name?.toLowerCase().includes(search.toLowerCase()) ||
      e.student_phone?.includes(search) || e.student_email?.toLowerCase().includes(search.toLowerCase());
    const matchCourse = courseFilter === "all" || e.course_id === courseFilter;
    const matchStatus = statusFilter === "all" || e.enrollment_status === statusFilter;
    return matchSearch && matchCourse && matchStatus;
  });

  const stats = {
    total: (enrollments.data || []).length,
    confirmed: (enrollments.data || []).filter((e: any) => e.enrollment_status === "confirmed").length,
    paid: (enrollments.data || []).filter((e: any) => e.payment_status === "paid").length,
    pending: (enrollments.data || []).filter((e: any) => e.payment_status === "pending").length,
  };

  const filteredClasses = form.course_id
    ? (classes.data || []).filter((c: any) => c.course_id === form.course_id)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Users className="text-primary" size={28} />
              Alunos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie as inscrições dos seus cursos</p>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <UserPlus size={16} /> Nova Inscrição
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-primary">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-success">{stats.confirmed}</p>
              <p className="text-[10px] text-muted-foreground">Confirmados</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-info">{stats.paid}</p>
              <p className="text-[10px] text-muted-foreground">Pagos</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-warning">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">Pgto Pendente</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar aluno..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Curso" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cursos</SelectItem>
              {(courses.data || []).map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmed">Confirmados</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table */}
        {enrollments.isLoading ? (
          <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users size={48} className="mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
              <p className="text-muted-foreground text-sm mb-4">Adicione inscrições manualmente ou ative a página pública</p>
              <Button onClick={() => handleOpen()} className="gap-2"><UserPlus size={16} /> Inscrever Aluno</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead className="hidden sm:table-cell">Curso</TableHead>
                    <TableHead className="hidden md:table-cell">Turma</TableHead>
                    <TableHead>Inscrição</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e: any) => {
                    const es = enrollmentStatusConfig[e.enrollment_status] || enrollmentStatusConfig.pending;
                    const ps = paymentStatusConfig[e.payment_status] || paymentStatusConfig.pending;
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{e.student_name}</p>
                            <p className="text-[11px] text-muted-foreground">{e.student_phone || e.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{e.courses?.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{e.course_classes?.name}</TableCell>
                        <TableCell><Badge variant={es.variant} className="text-[10px]">{es.label}</Badge></TableCell>
                        <TableCell><Badge variant={ps.variant} className="text-[10px]">{ps.label}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {e.enrolled_at ? format(new Date(e.enrolled_at), "dd/MM/yy", { locale: ptBR }) : "—"}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(e)}>
                            <Edit size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Inscrição" : "Nova Inscrição"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do aluno *</Label>
              <Input value={form.student_name} onChange={(e) => setForm(p => ({ ...p, student_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input value={form.student_phone} onChange={(e) => setForm(p => ({ ...p, student_phone: e.target.value }))} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.student_email} onChange={(e) => setForm(p => ({ ...p, student_email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CPF</Label>
                <Input value={form.student_cpf} onChange={(e) => setForm(p => ({ ...p, student_cpf: e.target.value }))} />
              </div>
              <div>
                <Label>Cidade</Label>
                <Input value={form.student_city} onChange={(e) => setForm(p => ({ ...p, student_city: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Curso *</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm(p => ({ ...p, course_id: v, class_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(courses.data || []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turma *</Label>
                <Select value={form.class_id} onValueChange={(v) => setForm(p => ({ ...p, class_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Status inscrição</Label>
                <Select value={form.enrollment_status} onValueChange={(v) => setForm(p => ({ ...p, enrollment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="confirmed">Confirmada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="waitlist">Lista de Espera</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pagamento</Label>
                <Select value={form.payment_status} onValueChange={(v) => setForm(p => ({ ...p, payment_status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="refunded">Reembolsado</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor pago</Label>
                <Input type="number" min={0} step={0.01} value={form.amount_paid} onChange={(e) => setForm(p => ({ ...p, amount_paid: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => setForm(p => ({ ...p, payment_method: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="transfer">Transferência</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.student_notes} onChange={(e) => setForm(p => ({ ...p, student_notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={createEnrollment.isPending || updateEnrollment.isPending}>
                {createEnrollment.isPending || updateEnrollment.isPending ? "Salvando..." : editing ? "Salvar" : "Inscrever"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CourseStudents;
