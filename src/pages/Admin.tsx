import { useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import AdminWhatsAppLogs from "@/components/admin/AdminWhatsAppLogs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, CreditCard, CalendarDays, DollarSign, MessageSquare,
  ArrowLeft, Loader2, Search, MoreHorizontal, Eye, Trash2,
  CheckCircle2, XCircle, Crown, TrendingUp, Building2,
  Ban, UserCheck, ToggleLeft, ToggleRight, Globe, MessageCircle as MsgIcon,
  BarChart3, ChevronDown, ChevronUp, ShieldAlert, X, Save, Sliders,
} from "lucide-react";
import {
  useAdminStats, useAllProfessionals, useAllBookings,
  useAllPayments, useAllWhatsAppInstances,
} from "@/hooks/useAdmin";
import { usePlanLimits, useUpdatePlanLimits } from "@/hooks/useCampaigns";
import { api } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import AdminMessageUsage from "@/components/admin/AdminMessageUsage";
import AdminCreateProfessional from "@/components/admin/AdminCreateProfessional";

type Section = "overview" | "professionals" | "bookings" | "finance" | "whatsapp" | "whatsapp-logs" | "plan-limits" | "message-usage";

const Admin = () => {
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const sections = [
    { id: "overview" as Section, icon: TrendingUp, label: "Visão Geral" },
    { id: "professionals" as Section, icon: Users, label: "Profissionais" },
    { id: "bookings" as Section, icon: CalendarDays, label: "Agendamentos" },
    { id: "finance" as Section, icon: DollarSign, label: "Financeiro" },
    { id: "whatsapp" as Section, icon: MessageSquare, label: "WhatsApp" },
    { id: "whatsapp-logs" as Section, icon: MessageSquare, label: "Logs WhatsApp" },
    { id: "plan-limits" as Section, icon: Sliders, label: "Limites de Plano" },
    { id: "message-usage" as Section, icon: MessageSquare, label: "Uso de Mensagens" },
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
          {activeSection === "whatsapp-logs" && <AdminWhatsAppLogs />}
          {activeSection === "plan-limits" && <PlanLimitsSection />}
          {activeSection === "message-usage" && <AdminMessageUsage />}
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const filtered = (professionals || []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase()) ||
    (p.business_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleBlock = async (profId: string, currentlyBlocked: boolean) => {
    const updates: any = { is_blocked: !currentlyBlocked };
    if (!currentlyBlocked) {
      updates.blocked_reason = blockReason || "";
    } else {
      updates.blocked_reason = "";
    }
    const { error } = await supabase.from("professionals").update(updates).eq("id", profId);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success(currentlyBlocked ? "Profissional desbloqueado" : "Profissional bloqueado");
      setBlockReason("");
    }
  };

  const toggleFeature = async (profId: string, feature: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("professionals")
      .update({ [feature]: !currentValue } as any)
      .eq("id", profId);
    if (!error) {
      qc.invalidateQueries({ queryKey: ["admin-professionals"] });
      toast.success("Funcionalidade atualizada");
    }
  };

  if (isLoading) return <Loading />;

  const featureLabels: Record<string, { label: string; icon: any }> = {
    feature_whatsapp: { label: "WhatsApp", icon: MsgIcon },
    feature_public_page: { label: "Página Pública", icon: Globe },
    feature_reports: { label: "Relatórios", icon: BarChart3 },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar profissional..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-accent text-accent-foreground text-sm font-semibold transition-all hover:opacity-90"
        >
          <Users size={16} />
          Cadastrar Profissional
        </button>
      </div>

      <AdminCreateProfessional
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["admin-professionals"] })}
      />

      <div className="space-y-3">
        {filtered.map((p) => {
          const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
          const isExpanded = expanded === p.id;
          const isBlocked = p.is_blocked;

          return (
            <div key={p.id} className={cn("glass-card rounded-2xl overflow-hidden transition-all", isBlocked && "opacity-60 ring-1 ring-destructive/30")}>
              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : p.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  {isBlocked ? <Ban size={18} className="text-destructive" /> : <UserCheck size={18} className="text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">{p.name || "Sem nome"}</span>
                    {isBlocked && <span className="text-[10px] font-bold uppercase bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">Bloqueado</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{p.email} · {p.business_name || "—"}</p>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
                  sub?.plan_id === "pro" ? "bg-accent/10 text-accent" :
                  sub?.plan_id === "starter" ? "bg-blue-500/10 text-blue-500" :
                  "bg-muted text-muted-foreground"
                )}>
                  {(sub?.plan_id || "free").toUpperCase()}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-muted-foreground shrink-0" /> : <ChevronDown size={16} className="text-muted-foreground shrink-0" />}
              </button>

              {/* Expanded panel */}
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="border-t border-border px-4 pb-4 pt-3 space-y-4"
                >
                  {/* Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div><span className="text-muted-foreground">Telefone:</span> <span className="text-foreground font-medium">{p.phone || "—"}</span></div>
                    <div><span className="text-muted-foreground">Slug:</span> <span className="text-foreground font-mono">{p.slug || "—"}</span></div>
                    <div><span className="text-muted-foreground">Criado em:</span> <span className="text-foreground">{format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}</span></div>
                    <div><span className="text-muted-foreground">Cor:</span> <span className="inline-block w-4 h-4 rounded align-middle ml-1" style={{ backgroundColor: p.primary_color || "#C4922A" }} /></div>
                  </div>

                  {/* Feature toggles */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Funcionalidades</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(featureLabels).map(([key, { label, icon: Icon }]) => {
                        const enabled = (p as any)[key] !== false;
                        return (
                          <button
                            key={key}
                            onClick={() => toggleFeature(p.id, key, enabled)}
                            className={cn(
                              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                              enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon size={12} />
                            {label}
                            {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Block/Unblock */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bloqueio</h4>
                    {!isBlocked ? (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Motivo (opcional)</label>
                          <input
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            placeholder="Ex: Violação dos termos..."
                            className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                          />
                        </div>
                        <button
                          onClick={() => toggleBlock(p.id, false)}
                          className="px-4 py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors flex items-center gap-1.5 shrink-0"
                        >
                          <Ban size={12} /> Bloquear
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {p.blocked_reason ? <>Motivo: <span className="text-foreground">{p.blocked_reason}</span></> : "Sem motivo informado"}
                        </div>
                        <button
                          onClick={() => toggleBlock(p.id, true)}
                          className="px-4 py-2 rounded-xl bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck size={12} /> Desbloquear
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">Nenhum profissional encontrado</div>
      )}
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

/* ===================== PLAN LIMITS ===================== */
const PlanLimitsSection = () => {
  const { data: planLimits, isLoading } = usePlanLimits();
  const updateLimits = useUpdatePlanLimits();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ daily_reminders: 0, daily_campaigns: 0, campaign_max_contacts: 0, campaign_min_interval_hours: 6 });

  const startEdit = (plan: any) => {
    setEditingId(plan.id);
    setForm({
      daily_reminders: plan.daily_reminders,
      daily_campaigns: plan.daily_campaigns,
      campaign_max_contacts: plan.campaign_max_contacts,
      campaign_min_interval_hours: plan.campaign_min_interval_hours,
    });
  };

  const handleSave = async (id: string) => {
    try {
      await updateLimits.mutateAsync({ id, ...form });
      toast.success("Limites atualizados");
      setEditingId(null);
    } catch {
      toast.error("Erro ao atualizar");
    }
  };

  if (isLoading) return <Loading />;

  const planLabels: Record<string, string> = { free: "Free", starter: "Starter", pro: "Pro" };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Configure os limites de mensagens para cada plano. Use <strong className="text-foreground">-1</strong> para ilimitado.</p>
      {(planLimits || []).map((plan: any) => {
        const isEditing = editingId === plan.id;
        return (
          <div key={plan.id} className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-lg">{planLabels[plan.plan_id] || plan.plan_id}</h3>
              {!isEditing ? (
                <button onClick={() => startEdit(plan)} className="text-xs font-semibold text-accent hover:underline">Editar</button>
              ) : (
                <button onClick={() => handleSave(plan.id)} disabled={updateLimits.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline disabled:opacity-50">
                  <Save size={12} /> Salvar
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { key: "daily_reminders", label: "Lembretes/dia" },
                { key: "daily_campaigns", label: "Campanhas/dia" },
                { key: "campaign_max_contacts", label: "Contatos/campanha" },
                { key: "campaign_min_interval_hours", label: "Intervalo (horas)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={(form as any)[key]}
                      onChange={(e) => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  ) : (
                    <p className="text-foreground font-semibold text-lg">
                      {(plan as any)[key] === -1 ? "∞" : (plan as any)[key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Loading = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-accent" />
  </div>
);

export default Admin;
