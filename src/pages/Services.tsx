import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Clock, DollarSign, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { useServices, useCreateService, useUpdateService, useDeleteService } from "@/hooks/useServices";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Service = Tables<"services">;

const defaultForm = { name: "", duration_minutes: 30, price: 0, category: "Geral", active: true, description: "" };

const Services = () => {
  const { data: services, isLoading } = useServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [activeCategory, setActiveCategory] = useState("Todos");

  const categories = ["Todos", ...new Set((services || []).map(s => s.category || "Geral"))];
  const filtered = activeCategory === "Todos" ? services : services?.filter(s => s.category === activeCategory);

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: Number(s.price), category: s.category || "Geral", active: s.active, description: s.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editing) {
        await updateService.mutateAsync({ id: editing.id, ...form });
        toast.success("Serviço atualizado!");
      } else {
        await createService.mutateAsync(form);
        toast.success("Serviço criado!");
      }
      setDialogOpen(false);
    } catch { toast.error("Erro ao salvar serviço"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteService.mutateAsync(id);
      toast.success("Serviço excluído!");
    } catch { toast.error("Erro ao excluir serviço"); }
  };

  return (
    <DashboardLayout title="Serviços" subtitle="Gerencie seus serviços e preços">
      <div className="flex items-center justify-between mb-8">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                cat === activeCategory
                  ? "gradient-accent text-accent-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover-lift">
          <Plus size={16} />
          Novo Serviço
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">Nenhum serviço cadastrado</p>
          <p className="text-sm mt-1">Crie seu primeiro serviço clicando no botão acima</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5 hover-lift group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-foreground">{service.name}</h3>
                  <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    {service.category || "Geral"}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted/50 transition-all">
                      <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(service)}>
                      <Pencil size={14} className="mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(service.id)}>
                      <Trash2 size={14} className="mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Clock size={14} />
                  <span>{service.duration_minutes} min</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  <DollarSign size={14} className="text-accent" />
                  <span>R$ {Number(service.price).toFixed(0)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    service.active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {service.active ? "Ativo" : "Inativo"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Duração (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: +e.target.value }))} /></div>
              <div><Label>Preço (R$)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
            </div>
            <div><Label>Categoria</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div><Label>Descrição</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
              <Label>Ativo</Label>
            </div>
            <button
              onClick={handleSave}
              disabled={createService.isPending || updateService.isPending}
              className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              {(createService.isPending || updateService.isPending) ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Services;
