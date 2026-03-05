import DashboardLayout from "@/components/layout/DashboardLayout";
import { useWaitlist, useUpdateWaitlistStatus, useDeleteWaitlistEntry } from "@/hooks/useWaitlist";
import { useServices } from "@/hooks/useServices";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import { Loader2, Clock, CheckCircle2, Bell, Trash2, Phone, Calendar, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const statusLabels: Record<string, { label: string; color: string; icon: any }> = {
  waiting: { label: "Aguardando", color: "bg-amber-500/10 text-amber-500", icon: Clock },
  notified: { label: "Notificado", color: "bg-blue-500/10 text-blue-500", icon: Bell },
  booked: { label: "Agendado", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
  expired: { label: "Expirado", color: "bg-muted text-muted-foreground", icon: Clock },
};

const periodLabels: Record<string, string> = {
  any: "Qualquer horário",
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

const Waitlist = () => {
  const { enabled: featureEnabled, isLoading: featureLoading } = useIsFeatureEnabled("waitlist");
  const { data: entries, isLoading } = useWaitlist();
  const { data: services } = useServices();
  const updateStatus = useUpdateWaitlistStatus();
  const deleteEntry = useDeleteWaitlistEntry();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = statusFilter === "all"
    ? entries || []
    : (entries || []).filter(e => e.status === statusFilter);

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    return services?.find((s: any) => s.id === serviceId)?.name || "—";
  };

  if (featureLoading || isLoading) {
    return (
      <DashboardLayout title="Lista de Espera" subtitle="Gerencie clientes aguardando horários">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!featureEnabled) {
    return (
      <DashboardLayout title="Lista de Espera" subtitle="Gerencie clientes aguardando horários">
        <div className="glass-card rounded-2xl p-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Funcionalidade em breve</h3>
          <p className="text-sm text-muted-foreground">A Lista de Espera será liberada em breve. Fique ligado!</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lista de Espera" subtitle="Gerencie clientes aguardando horários">
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aguardando", value: (entries || []).filter(e => e.status === "waiting").length, color: "text-amber-500" },
            { label: "Notificados", value: (entries || []).filter(e => e.status === "notified").length, color: "text-blue-500" },
            { label: "Agendados", value: (entries || []).filter(e => e.status === "booked").length, color: "text-emerald-500" },
            { label: "Total", value: (entries || []).length, color: "text-foreground" },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-xl p-3 text-center">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted-foreground" />
          {["all", "waiting", "notified", "booked", "expired"].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                statusFilter === s ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {s === "all" ? "Todos" : statusLabels[s]?.label || s}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma entrada na lista de espera</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(entry => {
              const statusConf = statusLabels[entry.status] || statusLabels.waiting;
              const StatusIcon = statusConf.icon;
              return (
                <div key={entry.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">{entry.client_name}</span>
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", statusConf.color)}>
                          <StatusIcon size={10} />
                          {statusConf.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Phone size={11} />{entry.client_phone}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />{format(new Date(entry.preferred_date + "T12:00:00"), "dd/MM/yyyy")}</span>
                        <span>{periodLabels[entry.preferred_period] || entry.preferred_period}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Serviço: {getServiceName(entry.service_id)}</p>
                      {entry.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{entry.notes}"</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {entry.status === "waiting" && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ id: entry.id, status: "notified" })}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                            title="Marcar como notificado"
                          >
                            <Bell size={14} />
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: entry.id, status: "booked" })}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            title="Marcar como agendado"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        </>
                      )}
                      {entry.status === "notified" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: entry.id, status: "booked" })}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                          title="Marcar como agendado"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteEntry.mutate(entry.id)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Waitlist;
