import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useSalonEmployees, useCreateSalonEmployee, useUpdateSalonEmployee, useDeleteSalonEmployee, SalonEmployee } from "@/hooks/useSalonEmployees";
import { useProfessional } from "@/hooks/useProfessional";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import EmployeeServiceAssignment from "@/components/team/EmployeeServiceAssignment";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Team = () => {
  const { data: professional } = useProfessional();
  const { data: employees, isLoading } = useSalonEmployees();
  const createEmployee = useCreateSalonEmployee();
  const updateEmployee = useUpdateSalonEmployee();
  const deleteEmployee = useDeleteSalonEmployee();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalonEmployee | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    commission_percentage: 50,
    is_active: true,
    has_login: false,
  });

  // Employee limits for Enterprise plan
  const MAX_EMPLOYEES_BASE = 5;
  const MAX_EMPLOYEES_HARD = 20;
  const ADDITIONAL_PRICE = 7;
  const activeCount = employees?.filter(e => e.is_active).length ?? 0;
  const isAtHardLimit = activeCount >= MAX_EMPLOYEES_HARD;
  const isAboveBase = activeCount >= MAX_EMPLOYEES_BASE;
  const additionalCost = Math.max(0, activeCount - MAX_EMPLOYEES_BASE) * ADDITIONAL_PRICE;
  const nextAdditionalCost = Math.max(0, activeCount + 1 - MAX_EMPLOYEES_BASE) * ADDITIONAL_PRICE;

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", specialty: "", commission_percentage: 50, is_active: true, has_login: false });
    setEditing(null);
  };

  const openEdit = (emp: SalonEmployee) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email || "",
      phone: emp.phone || "",
      specialty: emp.specialty || "",
      commission_percentage: emp.commission_percentage,
      is_active: emp.is_active,
      has_login: emp.has_login,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nome é obrigatório");

    if (!editing && isAtHardLimit) {
      return toast.error(`Limite máximo de ${MAX_EMPLOYEES_HARD} profissionais atingido.`);
    }

    if (!editing && isAboveBase) {
      const newCost = nextAdditionalCost;
      if (!confirm(`Você já possui ${activeCount} profissionais. Ao adicionar mais um, o custo adicional será de R$ ${newCost},00/mês. Deseja continuar?`)) {
        return;
      }
    }

    if (editing) {
      await updateEmployee.mutateAsync({ id: editing.id, ...form });
    } else {
      await createEmployee.mutateAsync(form);
    }
    setDialogOpen(false);
    resetForm();

    // Sync billing with Stripe after employee changes
    syncEmployeeBilling(editing ? activeCount : activeCount + 1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este funcionário?")) return;
    await deleteEmployee.mutateAsync(id);
    // Sync billing after removal
    syncEmployeeBilling(activeCount - 1);
  };

  const syncEmployeeBilling = async (newActiveCount: number) => {
    try {
      await supabase.functions.invoke("sync-employee-billing", {
        body: { activeEmployeeCount: newActiveCount },
      });
    } catch (err) {
      console.error("Failed to sync employee billing:", err);
    }
  };

  if (professional?.account_type !== "salon") {
    return (
      <DashboardLayout title="Equipe">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Users className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Recurso exclusivo para Salões</h2>
          <p className="text-muted-foreground max-w-md">
            A gestão de equipe está disponível apenas para contas do tipo Salão/Barbearia.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Equipe">
      <div className="space-y-6">
        {/* Employee limit info banner */}
        {employees && employees.length > 0 && (
          <div className={`rounded-xl border p-3 text-sm flex items-center justify-between ${
            isAtHardLimit ? "border-destructive/50 bg-destructive/5 text-destructive" :
            isAboveBase ? "border-accent/50 bg-accent/5 text-accent" :
            "border-border bg-muted/30 text-muted-foreground"
          }`}>
            <span>
              <strong>{activeCount}</strong> de {MAX_EMPLOYEES_BASE} profissionais inclusos
              {isAboveBase && !isAtHardLimit && (
                <> · <strong>{activeCount - MAX_EMPLOYEES_BASE}</strong> extra(s) = <strong>+R$ {additionalCost},00</strong>/mês</>
              )}
              {isAtHardLimit && " · Limite máximo atingido"}
            </span>
            <span className="text-xs opacity-60">máx {MAX_EMPLOYEES_HARD}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipe</h1>
            <p className="text-muted-foreground text-sm">Gerencie os profissionais do seu estabelecimento</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={isAtHardLimit}>
                <UserPlus size={16} />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Funcionário" : "Novo Funcionário"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Especialidade</Label>
                    <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} placeholder="Ex: Corte masculino" />
                  </div>
                  <div className="space-y-2">
                    <Label>Comissão (%)</Label>
                    <Input type="number" min={0} max={100} value={form.commission_percentage} onChange={(e) => setForm({ ...form, commission_percentage: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                    Ativo
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.has_login} onChange={(e) => setForm({ ...form, has_login: e.target.checked })} className="rounded" />
                    Acesso ao sistema
                  </label>
                </div>
                <Button type="submit" className="w-full" disabled={createEmployee.isPending || updateEmployee.isPending}>
                  {editing ? "Salvar Alterações" : "Adicionar Funcionário"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : employees && employees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <Card key={emp.id} className="p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-accent/10 text-accent font-bold">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{emp.name}</h3>
                      {emp.specialty && <p className="text-xs text-muted-foreground">{emp.specialty}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(emp)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(emp.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={emp.is_active ? "default" : "secondary"}>
                    {emp.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                  <Badge variant="outline">{emp.commission_percentage}% comissão</Badge>
                  {emp.has_login && <Badge variant="outline">Login ativo</Badge>}
                </div>
                {(emp.phone || emp.email) && (
                  <div className="mt-3 text-xs text-muted-foreground space-y-0.5">
                    {emp.phone && <p>{emp.phone}</p>}
                    {emp.email && <p>{emp.email}</p>}
                  </div>
                )}
                <EmployeeServiceAssignment employeeId={emp.id} employeeName={emp.name} />
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserPlus className="text-muted-foreground mb-4" size={40} />
            <h3 className="text-lg font-semibold mb-1">Nenhum funcionário</h3>
            <p className="text-muted-foreground text-sm mb-4">Adicione os profissionais da sua equipe.</p>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus size={16} />
              Adicionar primeiro funcionário
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Team;
