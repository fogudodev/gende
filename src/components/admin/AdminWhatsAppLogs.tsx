import { useState } from "react";
import { useAllWhatsAppLogs, useAllWhatsAppInstances } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, Loader2, CheckCircle2, XCircle, Clock,
  MessageSquare, AlertTriangle, Phone, Filter,
  Send,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const AdminWhatsAppLogs = () => {
  const { data: logs, isLoading } = useAllWhatsAppLogs(500);
  const { data: instances } = useAllWhatsAppInstances();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  const allLogs = logs || [];

  const filtered = allLogs.filter((log) => {
    const matchesSearch =
      (log.recipient_phone || "").includes(search) ||
      (log.message_content || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.professionals?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (log.error_message || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalSent = allLogs.filter((l) => l.status === "sent").length;
  const totalFailed = allLogs.filter((l) => l.status === "failed").length;
  const totalQueued = allLogs.filter((l) => l.status === "queued").length;
  const connectedInstances = (instances || []).filter((i) => i.status === "connected").length;

  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    sent: { label: "Enviado", color: "bg-emerald-500/10 text-emerald-500", icon: CheckCircle2 },
    failed: { label: "Falhou", color: "bg-red-500/10 text-red-500", icon: XCircle },
    queued: { label: "Na fila", color: "bg-yellow-500/10 text-yellow-600", icon: Clock },
    delivered: { label: "Entregue", color: "bg-blue-500/10 text-blue-500", icon: Send },
  };

  const formatErrorMessage = (error: string) => {
    try {
      const parsed = JSON.parse(error);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return error;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Mensagens Enviadas", value: totalSent, icon: Send, color: "text-emerald-500" },
          { label: "Falhas", value: totalFailed, icon: AlertTriangle, color: "text-red-500" },
          { label: "Na Fila", value: totalQueued, icon: Clock, color: "text-yellow-500" },
          { label: "Instâncias Conectadas", value: `${connectedInstances}/${(instances || []).length}`, icon: Phone, color: "text-accent" },
        ].map((c, i) => (
          <div key={i} className="glass-card rounded-2xl p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
              <c.icon size={14} className={c.color} />
            </div>
            <p className="text-xl font-bold text-foreground">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por telefone, mensagem, profissional..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-muted-foreground" />
          {["all", "sent", "failed", "queued"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                statusFilter === s
                  ? "gradient-accent text-accent-foreground"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "all" ? "Todos" : statusConfig[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Logs table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Destinatário</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Mensagem</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Data/Hora</th>
                <th className="text-left p-4 text-muted-foreground font-medium">Erro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((log) => {
                const config = statusConfig[log.status] || statusConfig.queued;
                const StatusIcon = config.icon;
                return (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="p-4">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold", config.color)}>
                        <StatusIcon size={12} />
                        {config.label}
                      </span>
                    </td>
                    <td className="p-4 text-foreground font-medium text-xs">
                      {log.professionals?.name || "—"}
                    </td>
                    <td className="p-4 text-muted-foreground font-mono text-xs">
                      {log.recipient_phone}
                    </td>
                    <td className="p-4 max-w-[300px]">
                      <p className="text-foreground text-xs truncate">{log.message_content}</p>
                    </td>
                    <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </td>
                    <td className="p-4 max-w-[200px]">
                      {log.error_message ? (
                        <p className="text-red-400 text-xs truncate">{log.error_message}</p>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground text-sm">
            <MessageSquare size={24} className="mx-auto mb-2 opacity-50" />
            Nenhum log encontrado
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} logs encontrados</p>

      {/* Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes do Log
              {selectedLog && (
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold",
                  statusConfig[selectedLog.status]?.color || "bg-muted text-muted-foreground"
                )}>
                  {statusConfig[selectedLog.status]?.label || selectedLog.status}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>Informações completas da mensagem</DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Profissional</p>
                  <p className="text-foreground font-medium">{selectedLog.professionals?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Destinatário</p>
                  <p className="text-foreground font-mono">{selectedLog.recipient_phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Data/Hora</p>
                  <p className="text-foreground">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Enviado em</p>
                  <p className="text-foreground">
                    {selectedLog.sent_at
                      ? format(new Date(selectedLog.sent_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                      : "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs mb-1">Mensagem Completa</p>
                <div className="bg-muted/50 rounded-xl p-3 whitespace-pre-wrap text-foreground text-xs leading-relaxed border border-border">
                  {selectedLog.message_content}
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <p className="text-red-400 text-xs mb-1 font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} /> Erro Completo
                  </p>
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-red-400 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed">
                    {formatErrorMessage(selectedLog.error_message)}
                  </div>
                </div>
              )}

              {selectedLog.booking_id && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">ID do Agendamento</p>
                  <p className="text-foreground font-mono text-xs">{selectedLog.booking_id}</p>
                </div>
              )}

              {selectedLog.automation_id && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">ID da Automação</p>
                  <p className="text-foreground font-mono text-xs">{selectedLog.automation_id}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminWhatsAppLogs;
