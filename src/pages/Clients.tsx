import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, CalendarDays, Pencil, Trash2, Loader2, Download, Upload } from "lucide-react";
import { exportToCSV, importCSVFile } from "@/lib/csv-utils";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

type Client = Tables<"clients">;
const defaultForm = { name: "", phone: "", email: "", notes: "" };

const Clients = () => {
  const { data: clients, isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(defaultForm);

  const filtered = (clients || []).filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || "").includes(search)
  );

  const openCreate = () => { setEditing(null); setForm(defaultForm); setDialogOpen(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", notes: c.notes || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, ...form });
        toast.success("Cliente atualizado!");
      } else {
        await createClient.mutateAsync(form);
        toast.success("Cliente criado!");
      }
      setDialogOpen(false);
    } catch { toast.error("Erro ao salvar cliente"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteClient.mutateAsync(id);
      toast.success("Cliente excluído!");
    } catch { toast.error("Erro ao excluir cliente"); }
  };

  return (
    <DashboardLayout title="Clientes" subtitle="Base de clientes e histórico">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              if (!clients?.length) return;
              exportToCSV(clients.map(c => ({
                nome: c.name,
                telefone: c.phone || "",
                email: c.email || "",
                notas: c.notes || "",
                cadastro: format(new Date(c.created_at), "dd/MM/yyyy"),
              })), "clientes", [
                { key: "nome", label: "Nome" },
                { key: "telefone", label: "Telefone" },
                { key: "email", label: "Email" },
                { key: "notas", label: "Notas" },
                { key: "cadastro", label: "Cadastro" },
              ]);
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
            title="Exportar CSV"
          >
            <Download size={16} />
          </button>
          <button
            onClick={async () => {
              try {
                const rows = await importCSVFile();
                let count = 0;
                for (const row of rows) {
                  const name = row["Nome"] || row["nome"] || "";
                  if (!name) continue;
                  await createClient.mutateAsync({
                    name,
                    phone: row["Telefone"] || row["telefone"] || "",
                    email: row["Email"] || row["email"] || "",
                    notes: row["Notas"] || row["notas"] || "",
                  });
                  count++;
                }
                toast.success(`${count} cliente(s) importado(s)!`);
              } catch (e: any) {
                toast.error(e.message || "Erro ao importar");
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
            title="Importar CSV"
          >
            <Upload size={16} />
          </button>
          <button onClick={openCreate} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover-lift shrink-0">
            <Plus size={16} />
            Novo Cliente
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="text-lg font-medium">{search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}</p>
          <p className="text-sm mt-1">{search ? "Tente outro termo de busca" : "Crie seu primeiro cliente clicando no botão acima"}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-0">
          {/* Desktop table header */}
          <div className="hidden sm:grid glass-card rounded-2xl overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_1fr_120px_80px] gap-4 px-6 py-3 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Cliente</span>
              <span>Telefone</span>
              <span>Email</span>
              <span>Cadastro</span>
              <span>Ações</span>
            </div>
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="grid grid-cols-[1fr_1fr_1fr_120px_80px] gap-4 px-6 py-4 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-semibold text-accent-foreground shrink-0">
                    {client.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground truncate">{client.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                  <Phone size={13} className="shrink-0" />
                  {client.phone || "—"}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                  <Mail size={13} className="shrink-0" />
                  {client.email || "—"}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays size={13} className="shrink-0" />
                  {format(new Date(client.created_at), "dd/MM/yyyy")}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Pencil size={14} className="text-muted-foreground" />
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((client, i) => (
              <motion.div
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-semibold text-accent-foreground shrink-0">
                      {client.name.charAt(0)}
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate">{client.name}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(client)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(client.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                      <Trash2 size={14} className="text-destructive" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {client.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone size={12} className="shrink-0" /> {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={12} className="shrink-0" /> {client.email}
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <CalendarDays size={12} className="shrink-0" /> {format(new Date(client.created_at), "dd/MM/yyyy")}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>Notas</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <button
              onClick={handleSave}
              disabled={createClient.isPending || updateClient.isPending}
              className="w-full py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm disabled:opacity-50"
            >
              {(createClient.isPending || updateClient.isPending) ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Clients;
