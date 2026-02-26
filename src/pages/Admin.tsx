import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, CreditCard, CalendarDays, DollarSign, MessageSquare,
  ArrowLeft, Loader2, Search, MoreHorizontal, Eye, Trash2,
  CheckCircle2, XCircle, Crown, TrendingUp, Building2,
  Ban, UserCheck,
} from "lucide-react";
import {
  useAdminStats, useAllProfessionals, useAllBookings,
  useAllPayments, useAllWhatsAppInstances,
} from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Section = "overview" | "professionals" | "bookings" | "finance" | "whatsapp";

const Admin = () => {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const sections = [
    { id: "overview" as Section, icon: TrendingUp, label: "Visão Geral" },
    { id: "professionals" as Section, icon: Users, label: "Profissionais" },
    { id: "bookings" as Section, icon: CalendarDays, label: "Agendamentos" },
    { id: "finance" as Section, icon: DollarSign, label: "Financeiro" },
    { id: "whatsapp" as Section, icon: MessageSquare, label: "WhatsApp" },
  ];

  return (
    <DashboardLayout title="Admin Master" subtitle="Painel de controle global">
      {/* Tab nav */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
              activeSection === s.id
                ? "gradient-accent text-accent-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <s.icon size={16} />
            {s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {activeSection === "overview" && <OverviewSection />}
          {activeSection === "professionals" && <ProfessionalsSection />}
          {activeSection === "bookings" && <BookingsSection />}
          {activeSection === "finance" && <FinanceSection />}
          {activeSection === "whatsapp" && <WhatsAppSection />}
        </motion.div>
      </AnimatePresence>
    </DashboardLayout>
  );
};

/* ===================== OVERVIEW ===================== */
const OverviewSection = () => {
  const { data: stats, isLoading } = useAdminStats();

  if (isLoading) return <Loading />;

  const cards = [
    { label: "Profissionais", value: stats?.totalProfessionals || 0, icon: Users, color: "text-blue-500" },
    { label: "Agendamentos", value: stats?.totalBookings || 0, icon: CalendarDays, color: "text-emerald-500" },
    { label: "Clientes", value: stats?.totalClients || 0, icon: Building2, color: "text-purple-500" },
    { label: "Receita Total", value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "text-amber-500" },
    { label: "Assinaturas Pagas", value: `${stats?.activeSubscriptions || 0}/${stats?.totalSubscriptions || 0}`, icon: Crown, color: "text-accent" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card rounded-2xl p-5 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
            <c.icon size={16} className={c.color} />
          </div>
          <p className="text-2xl font-bold text-foreground">{c.value}</p>
        </motion.div>
      ))}
    </div>
  );
};

/* ===================== PROFESSIONALS ===================== */
const ProfessionalsSection = () => {
  const { data: professionals, isLoading } = useAllProfessionals();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const filtered = (professionals || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.business_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleProfessional = async (profId: string, currentSlug: string | null) => {
    // Disable by removing slug (simplest approach without adding columns)
    const newSlug = currentSlug ? null : profId.slice(0, 8);
    const { error } = await supabase
      .from("professionals")
      .update({ slug: currentSlug ? null : currentSlug })
      .eq("id", profId);

    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success(currentSlug ? "Profissional desativado" : "Profissional reativado");
    }
  };

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar profissional..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Negócio</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Slug</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{p.name || "—"}</td>
                    <td className="p-4 text-muted-foreground">{p.business_name || "—"}</td>
                    <td className="p-4 text-muted-foreground">{p.email}</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        sub?.plan_id === "pro" ? "bg-accent/10 text-accent" :
                        sub?.plan_id === "starter" ? "bg-blue-500/10 text-blue-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {(sub?.plan_id || "free").toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">{p.slug || "—"}</td>
                    <td className="p-4 text-muted-foreground">
                      {format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum profissional encontrado</div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} profissionais</p>
    </div>
  );
};

/* ===================== BOOKINGS ===================== */
const BookingsSection = () => {
  const { data: bookings, isLoading } = useAllBookings();
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const filtered = (bookings || []).filter((b) =>
    (b.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (b.professionals?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("bookings").update({ status: status as any }).eq("id", id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Status atualizado");
    }
  };

  const deleteBooking = async (id: string) => {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success("Agendamento removido");
    }
  };

  if (isLoading) return <Loading />;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600",
    confirmed: "bg-blue-500/10 text-blue-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    cancelled: "bg-red-500/10 text-red-500",
    no_show: "bg-muted text-muted-foreground",
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar agendamento..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
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
  );
};

/* ===================== FINANCE ===================== */
const FinanceSection = () => {
  const { data: payments, isLoading } = useAllPayments();

  if (isLoading) return <Loading />;

  const totalRevenue = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const completed = (payments || []).filter((p) => p.status === "completed");
  const pending = (payments || []).filter((p) => p.status === "pending");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Receita Total", value: `R$ ${totalRevenue.toFixed(2)}`, icon: DollarSign },
          { label: "Pagamentos Concluídos", value: completed.length, icon: CheckCircle2 },
          { label: "Pagamentos Pendentes", value: pending.length, icon: XCircle },
        ].map((c, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
              <c.icon size={16} className="text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Valor</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {(payments || []).slice(0, 100).map((p) => (
                <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{p.professionals?.name || "—"}</td>
                  <td className="p-4 text-foreground font-medium">R$ {Number(p.amount).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      p.status === "completed" ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-600"
                    )}>
                      {p.status === "completed" ? "Concluído" : "Pendente"}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {format(new Date(p.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments || []).length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhum pagamento encontrado</div>
        )}
      </div>
    </div>
  );
};

/* ===================== WHATSAPP ===================== */
const WhatsAppSection = () => {
  const { data: instances, isLoading } = useAllWhatsAppInstances();

  if (isLoading) return <Loading />;

  const statusLabel: Record<string, string> = {
    connected: "Conectado",
    disconnected: "Desconectado",
    connecting: "Conectando",
    error: "Erro",
  };

  const statusColor: Record<string, string> = {
    connected: "bg-emerald-500/10 text-emerald-500",
    disconnected: "bg-red-500/10 text-red-500",
    connecting: "bg-yellow-500/10 text-yellow-600",
    error: "bg-red-500/10 text-red-500",
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Instância</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Telefone</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Criado em</th>
              </tr>
            </thead>
            <tbody>
              {(instances || []).map((inst) => (
                <tr key={inst.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{inst.professionals?.name || "—"}</td>
                  <td className="p-4 text-muted-foreground font-mono text-xs">{inst.instance_name}</td>
                  <td className="p-4 text-muted-foreground">{inst.phone_number || "—"}</td>
                  <td className="p-4">
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", statusColor[inst.status] || "bg-muted")}>
                      {statusLabel[inst.status] || inst.status}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {format(new Date(inst.created_at), "dd/MM/yy", { locale: ptBR })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(instances || []).length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma instância WhatsApp</div>
        )}
      </div>
    </div>
  );
};

const Loading = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-accent" />
  </div>
);

export default Admin;
