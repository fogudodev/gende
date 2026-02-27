import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAllWhatsAppLogs } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MessageSquare, Calendar, Zap, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";

type LogTab = "whatsapp" | "bookings" | "google-calendar";

const useAdminBookingLogs = (limit = 200) => {
  return useQuery({
    queryKey: ["admin-booking-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, client_name, client_phone, start_time, created_at, updated_at, google_calendar_event_id, professionals(name, business_name), services(name)")
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });
};

const useAdminGoogleCalendarLogs = () => {
  return useQuery({
    queryKey: ["admin-gcal-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("*, professionals:professional_id(name, business_name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

const AdminLogsPage = () => {
  const [activeTab, setActiveTab] = useState<LogTab>("whatsapp");
  const [search, setSearch] = useState("");

  const tabs: { id: LogTab; label: string; icon: any }[] = [
    { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
    { id: "bookings", label: "Agendamentos", icon: Calendar },
    { id: "google-calendar", label: "Google Calendar", icon: Calendar },
  ];

  return (
    <AdminLayout title="Logs do Sistema" subtitle="Todos os logs centralizados">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nos logs..."
            className="pl-10"
          />
        </div>

        {/* Content */}
        {activeTab === "whatsapp" && <WhatsAppLogsTab search={search} />}
        {activeTab === "bookings" && <BookingLogsTab search={search} />}
        {activeTab === "google-calendar" && <GoogleCalendarLogsTab search={search} />}
      </div>
    </AdminLayout>
  );
};

/* ============ WhatsApp Logs ============ */
const WhatsAppLogsTab = ({ search }: { search: string }) => {
  const { data: logs, isLoading } = useAllWhatsAppLogs(500);

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (logs || []).filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.recipient_phone?.toLowerCase().includes(s) ||
      l.message_content?.toLowerCase().includes(s) ||
      l.status?.toLowerCase().includes(s) ||
      (l.professionals as any)?.name?.toLowerCase().includes(s) ||
      l.error_message?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{filtered.length} registros</span>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Profissional</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Telefone</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Mensagem</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Erro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </td>
                <td className="p-3 text-foreground text-xs">{(log.professionals as any)?.name || "—"}</td>
                <td className="p-3 text-muted-foreground text-xs font-mono">{log.recipient_phone}</td>
                <td className="p-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{log.message_content}</td>
                <td className="p-3 text-red-400 text-xs max-w-[150px] truncate">{log.error_message || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum log encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============ Booking Logs ============ */
const BookingLogsTab = ({ search }: { search: string }) => {
  const { data: logs, isLoading } = useAdminBookingLogs(500);

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (logs || []).filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.client_name?.toLowerCase().includes(s) ||
      l.client_phone?.toLowerCase().includes(s) ||
      l.status?.toLowerCase().includes(s) ||
      (l.professionals as any)?.name?.toLowerCase().includes(s) ||
      (l.services as any)?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{filtered.length} registros</span>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card z-10">
            <tr className="border-b border-border">
              <th className="text-left p-3 text-muted-foreground font-medium">Data</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Profissional</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Cliente</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Serviço</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
              <th className="text-left p-3 text-muted-foreground font-medium">GCal</th>
              <th className="text-left p-3 text-muted-foreground font-medium">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(log.start_time), "dd/MM HH:mm", { locale: ptBR })}
                </td>
                <td className="p-3 text-foreground text-xs">{(log.professionals as any)?.name || "—"}</td>
                <td className="p-3 text-foreground text-xs">{log.client_name || "—"}</td>
                <td className="p-3 text-muted-foreground text-xs">{(log.services as any)?.name || "—"}</td>
                <td className="p-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="p-3 text-xs">
                  {(log as any).google_calendar_event_id ? (
                    <span className="text-emerald-500">✓ Sincronizado</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                  {format(new Date(log.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum log encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============ Google Calendar Logs ============ */
const GoogleCalendarLogsTab = ({ search }: { search: string }) => {
  const { data: tokens, isLoading } = useAdminGoogleCalendarLogs();

  if (isLoading) return <LoadingSkeleton />;

  const filtered = (tokens || []).filter((t) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (t.professionals as any)?.name?.toLowerCase().includes(s) ||
      (t.professionals as any)?.business_name?.toLowerCase().includes(s) ||
      t.calendar_id?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Total Conectados</span>
          <p className="text-2xl font-bold text-foreground">{(tokens || []).filter(t => t.sync_enabled).length}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Sincronização Ativa</span>
          <p className="text-2xl font-bold text-foreground">{(tokens || []).filter(t => t.sync_enabled).length}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 space-y-2">
          <span className="text-xs text-muted-foreground font-medium">Total Tokens</span>
          <p className="text-2xl font-bold text-foreground">{(tokens || []).length}</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <span className="text-sm font-medium text-foreground">{filtered.length} conexões</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-muted-foreground font-medium">Profissional</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Calendário</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Sync</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Última Sincronização</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Token Expira</th>
                <th className="text-left p-3 text-muted-foreground font-medium">Conectado em</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((token) => (
                <tr key={token.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3 text-foreground text-xs font-medium">
                    {(token.professionals as any)?.business_name || (token.professionals as any)?.name || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{token.calendar_id}</td>
                  <td className="p-3">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      token.sync_enabled ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {token.sync_enabled ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                    {token.last_synced_at
                      ? format(new Date(token.last_synced_at), "dd/MM/yy HH:mm", { locale: ptBR })
                      : "Nunca"}
                  </td>
                  <td className="p-3 text-xs whitespace-nowrap">
                    {new Date(token.token_expires_at) < new Date() ? (
                      <span className="text-red-400">Expirado</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {format(new Date(token.token_expires_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                    {format(new Date(token.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhuma conexão encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============ Shared Components ============ */
const StatusBadge = ({ status }: { status: string }) => {
  const colors: Record<string, string> = {
    sent: "bg-emerald-500/10 text-emerald-500",
    delivered: "bg-emerald-500/10 text-emerald-500",
    completed: "bg-emerald-500/10 text-emerald-500",
    confirmed: "bg-blue-500/10 text-blue-500",
    pending: "bg-amber-500/10 text-amber-600",
    queued: "bg-amber-500/10 text-amber-600",
    failed: "bg-red-500/10 text-red-500",
    error: "bg-red-500/10 text-red-500",
    cancelled: "bg-red-500/10 text-red-500",
    no_show: "bg-red-500/10 text-red-500",
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", colors[status] || "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
};

const LoadingSkeleton = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-accent" />
  </div>
);

export default AdminLogsPage;
