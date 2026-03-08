import DashboardLayout from "@/components/layout/DashboardLayout";
import { useWaitlist, useUpdateWaitlistStatus, useDeleteWaitlistEntry } from "@/hooks/useWaitlist";
import { useWaitlistSettings, useUpsertWaitlistSettings } from "@/hooks/useWaitlistSettings";
import { useWaitlistMetrics } from "@/hooks/useWaitlistOffers";
import { useServices } from "@/hooks/useServices";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import {
  Loader2, Clock, CheckCircle2, Bell, Trash2, Phone, Calendar,
  Filter, TrendingUp, Zap, Settings2, Users, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const { data: settings } = useWaitlistSettings();
  const upsertSettings = useUpsertWaitlistSettings();
  const updateStatus = useUpdateWaitlistStatus();
  const deleteEntry = useDeleteWaitlistEntry();
  const metrics = useWaitlistMetrics();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tab, setTab] = useState<"list" | "metrics" | "settings">("list");

  const filtered = statusFilter === "all"
    ? entries || []
    : (entries || []).filter(e => e.status === statusFilter);

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "—";
    return services?.find((s: any) => s.id === serviceId)?.name || "—";
  };

  if (featureLoading || isLoading) {
    return (
      <DashboardLayout title="Lista de Espera Inteligente" subtitle="Preencha horários vagos automaticamente">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!featureEnabled) {
    return (
      <DashboardLayout title="Lista de Espera Inteligente" subtitle="Preencha horários vagos automaticamente">
        <div className="glass-card rounded-2xl p-8 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground mb-1">Funcionalidade em breve</h3>
          <p className="text-sm text-muted-foreground">A Lista de Espera será liberada em breve. Fique ligado!</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Lista de Espera Inteligente" subtitle="Preencha horários vagos automaticamente">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: "list" as const, label: "Fila", icon: Users },
            { key: "metrics" as const, label: "Métricas", icon: BarChart3 },
            { key: "settings" as const, label: "Configurações", icon: Settings2 },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                tab === t.key ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Stats row (always visible) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Aguardando", value: (entries || []).filter(e => e.status === "waiting").length, color: "text-amber-500", icon: Clock },
            { label: "Horários Recuperados", value: metrics.accepted, color: "text-emerald-500", icon: CheckCircle2 },
            { label: "Ofertas Enviadas", value: metrics.totalSent, color: "text-blue-500", icon: Zap },
            { label: "Taxa de Conversão", value: `${metrics.conversionRate}%`, color: "text-primary", icon: TrendingUp },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <stat.icon size={14} className={stat.color} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              </div>
              <p className={cn("text-xl font-bold", stat.color)}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* TAB: List */}
        {tab === "list" && (
          <>
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

            {filtered.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma entrada na lista de espera</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clientes entram automaticamente quando não há horários disponíveis.
                </p>
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
          </>
        )}

        {/* TAB: Metrics */}
        {tab === "metrics" && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                Desempenho dos últimos 30 dias
              </h3>

              {metrics.totalSent === 0 ? (
                <div className="text-center py-6">
                  <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma oferta enviada ainda.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando um agendamento for cancelado, o sistema enviará ofertas automaticamente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-xs text-muted-foreground">Ofertas enviadas</span>
                    <span className="text-sm font-bold text-foreground">{metrics.totalSent}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5">
                    <span className="text-xs text-muted-foreground">Horários recuperados</span>
                    <span className="text-sm font-bold text-emerald-500">{metrics.accepted}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <span className="text-xs text-muted-foreground">Ofertas expiradas</span>
                    <span className="text-sm font-bold text-muted-foreground">{metrics.expired}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
                    <span className="text-xs text-muted-foreground">Taxa de conversão</span>
                    <span className="text-sm font-bold text-primary">{metrics.conversionRate}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Recent offers */}
            {metrics.recentOffers.length > 0 && (
              <div className="glass-card rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-3">Ofertas Recentes</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {metrics.recentOffers.slice(0, 20).map(offer => (
                    <div key={offer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs">
                      <div>
                        <span className="font-medium text-foreground">{offer.client_name}</span>
                        <span className="text-muted-foreground ml-2">
                          {format(new Date(offer.slot_start), "dd/MM HH:mm")}
                        </span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-medium",
                        offer.status === "accepted" ? "bg-emerald-500/10 text-emerald-500" :
                        offer.status === "sent" ? "bg-blue-500/10 text-blue-500" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {offer.status === "accepted" ? "Aceita" :
                         offer.status === "sent" ? "Enviada" :
                         offer.status === "expired" ? "Expirada" :
                         offer.status === "slot_taken" ? "Preenchida" : offer.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Settings */}
        {tab === "settings" && (
          <div className="glass-card rounded-2xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Settings2 size={16} className="text-primary" />
              Configurações da Lista de Espera
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Ativar Lista de Espera</Label>
                  <p className="text-xs text-muted-foreground">Processar automaticamente cancelamentos</p>
                </div>
                <Switch
                  checked={settings?.enabled !== false}
                  onCheckedChange={(checked) => upsertSettings.mutate({ enabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Processamento Automático</Label>
                  <p className="text-xs text-muted-foreground">Enviar ofertas via WhatsApp automaticamente</p>
                </div>
                <Switch
                  checked={settings?.auto_process !== false}
                  onCheckedChange={(checked) => upsertSettings.mutate({ auto_process: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Priorizar Clientes VIP</Label>
                  <p className="text-xs text-muted-foreground">Clientes frequentes recebem ofertas primeiro</p>
                </div>
                <Switch
                  checked={settings?.prioritize_vip !== false}
                  onCheckedChange={(checked) => upsertSettings.mutate({ prioritize_vip: checked })}
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Máximo de Notificações</Label>
                <p className="text-xs text-muted-foreground mb-2">Quantos clientes notificar por cancelamento</p>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings?.max_notifications || 3}
                  onChange={(e) => upsertSettings.mutate({ max_notifications: parseInt(e.target.value) || 3 })}
                  className="w-24"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Tempo de Reserva (minutos)</Label>
                <p className="text-xs text-muted-foreground mb-2">Tempo que o cliente tem para aceitar a oferta</p>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={settings?.reservation_minutes || 3}
                  onChange={(e) => upsertSettings.mutate({ reservation_minutes: parseInt(e.target.value) || 3 })}
                  className="w-24"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Waitlist;
