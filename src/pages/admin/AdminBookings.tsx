import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAllBookings, useAllProfessionals } from "@/hooks/useAdmin";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search, Loader2, Trash2 } from "lucide-react";

const AdminBookings = () => {
  const { data: bookings, isLoading } = useAllBookings();
  const { data: professionals } = useAllProfessionals();
  const [search, setSearch] = useState("");
  const [filterProfessional, setFilterProfessional] = useState<string>("all");
  const qc = useQueryClient();

  const filtered = (bookings || [])
    .filter(b => filterProfessional === "all" || b.professional_id === filterProfessional)
    .filter(b =>
      (b.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.professionals?.name || "").toLowerCase().includes(search.toLowerCase())
    );

  const updateStatus = async (id: string, status: string) => {
    const { error } = await api.from("bookings").update({ status: status as any }).eq("id", id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Status atualizado");
    }
  };

  const deleteBooking = async (id: string) => {
    if (!confirm("Remover este agendamento?")) return;
    const { error } = await api.from("bookings").delete().eq("id", id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Agendamento removido");
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    confirmed: "bg-blue-500/10 text-blue-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    cancelled: "bg-red-500/10 text-red-500",
    no_show: "bg-muted text-muted-foreground",
  };

  return (
    <AdminLayout title="Agendamentos" subtitle="Todos os agendamentos da plataforma">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar agendamento..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <select
              value={filterProfessional}
              onChange={(e) => setFilterProfessional(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              <option value="all">Todos os profissionais</option>
              {(professionals || []).map(p => (
                <option key={p.id} value={p.id}>{p.name || p.business_name || p.email}</option>
              ))}
            </select>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Cliente</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Serviço</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Data/Hora</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Valor</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((b) => (
                    <tr key={b.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{b.client_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{b.professionals?.name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{b.services?.name || "—"}</td>
                      <td className="p-4 text-muted-foreground">
                        {format(new Date(b.start_time), "dd/MM HH:mm", { locale: ptBR })}
                      </td>
                      <td className="p-4 text-foreground font-medium">R$ {Number(b.price).toFixed(2)}</td>
                      <td className="p-4">
                        <select
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value)}
                          className={cn("px-2 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer", statusColors[b.status] || "bg-muted")}
                        >
                          <option value="pending">Pendente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="completed">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                          <option value="no_show">Não compareceu</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => deleteBooking(b.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhum agendamento encontrado</div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{filtered.length} agendamentos</p>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBookings;
