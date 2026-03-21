import { useState, useEffect } from "react";
import { CalendarIcon, Loader2, CheckCircle2, XCircle, RefreshCw, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useProfessional } from "@/hooks/useProfessional";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { toast } from "sonner";

interface CalendarStatus {
  connected: boolean;
  sync_enabled?: boolean;
  last_synced_at?: string;
  calendar_id?: string;
}

export const GoogleCalendarSection = () => {
  const { data: professional } = useProfessional();
  const { hasFeature } = useFeatureAccess();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [importing, setImporting] = useState(false);

  const canAccess = hasFeature("google-calendar") && professional?.account_type === "salon";

  const fetchStatus = async () => {
    if (!professional) return;
    setLoading(true);
    try {
      const { data: { session } } = await api.auth.getSession();
      if (!session) return;

      const { data, error } = await api.functions.invoke("google-calendar-auth", {
        body: { action: "status" },
      });

      if (error) throw error;
      setStatus(data);
    } catch (err: any) {
      console.error("Status error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess && professional) fetchStatus();
    else setLoading(false);
  }, [professional, canAccess]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data, error } = await api.functions.invoke("google-calendar-auth", {
        body: { action: "get_auth_url" },
      });
      if (error) throw error;
      if (data?.auth_url) {
        window.open(data.auth_url, "_blank", "width=600,height=700");
        // Poll for status change
        const interval = setInterval(async () => {
          await fetchStatus();
        }, 3000);
        setTimeout(() => clearInterval(interval), 60000);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao conectar");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { error } = await api.functions.invoke("google-calendar-auth", {
        body: { action: "disconnect" },
      });
      if (error) throw error;
      setStatus({ connected: false });
      toast.success("Google Calendar desconectado");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleImportEvents = async () => {
    if (!professional) return;
    setImporting(true);
    try {
      const { data, error } = await api.functions.invoke("google-calendar-sync", {
        body: { action: "import_events", professional_id: professional.id },
      });
      if (error) throw error;
      if (data?.synced) {
        toast.success(`${data.imported} eventos importados como horários bloqueados`);
        fetchStatus();
      } else {
        toast.error(data?.error || "Falha ao importar eventos");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao importar eventos");
    } finally {
      setImporting(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarIcon size={20} className="text-accent" />
          <h2 className="text-lg font-bold text-foreground">Google Calendar</h2>
        </div>
        <div className="glass-card rounded-2xl p-6 text-center space-y-3">
          <Crown size={32} className="text-amber-500 mx-auto" />
          <p className="text-sm text-muted-foreground">
            A integração com Google Calendar está disponível apenas para contas <strong>Salão</strong> no plano <strong>Enterprise</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarIcon size={20} className="text-accent" />
        <h2 className="text-lg font-bold text-foreground">Google Calendar</h2>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status?.connected ? (
              <CheckCircle2 size={20} className="text-emerald-500" />
            ) : (
              <XCircle size={20} className="text-red-500" />
            )}
            <div>
              <p className="font-medium text-foreground text-sm">
                {status?.connected ? "Conectado" : "Desconectado"}
              </p>
              {status?.connected && status?.last_synced_at && (
                <p className="text-xs text-muted-foreground">
                  Última sincronização: {new Date(status.last_synced_at).toLocaleString("pt-BR")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {!status?.connected ? (
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full gradient-accent text-accent-foreground"
          >
            {connecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CalendarIcon className="w-4 h-4 mr-2" />
            )}
            Conectar Google Calendar
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Novos agendamentos serão sincronizados automaticamente. Eventos do Google Calendar serão importados como horários bloqueados.
            </p>

            <Button
              onClick={handleImportEvents}
              disabled={importing}
              variant="outline"
              className="w-full"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Importar eventos (próximos 30 dias)
            </Button>

            <Button
              onClick={handleDisconnect}
              disabled={disconnecting}
              variant="ghost"
              className="w-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Desconectar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
