import AdminLayout from "@/components/layout/AdminLayout";
import { useAllWhatsAppInstances } from "@/hooks/useAdmin";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  connected: "Conectado", disconnected: "Desconectado", connecting: "Conectando", error: "Erro",
};
const statusColor: Record<string, string> = {
  connected: "bg-emerald-500/10 text-emerald-500",
  disconnected: "bg-red-500/10 text-red-500",
  connecting: "bg-yellow-500/10 text-yellow-600",
  error: "bg-red-500/10 text-red-500",
};

const AdminWhatsAppPage = () => {
  const { data: instances, isLoading, refetch } = useAllWhatsAppInstances();
  const [syncing, setSyncing] = useState(false);

  const handleSyncStatus = async () => {
    if (!instances?.length) return;
    setSyncing(true);
    try {
      for (const inst of instances) {
        await api.functions.invoke("whatsapp", {
          body: { action: "check-status", instanceName: inst.instance_name, professionalId: inst.professional_id },
        });
      }
      await refetch();
      toast.success("Status sincronizado com sucesso!");
    } catch {
      toast.error("Erro ao sincronizar status");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <AdminLayout title="WhatsApp" subtitle="Instâncias de WhatsApp">
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={handleSyncStatus} disabled={syncing || isLoading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", syncing && "animate-spin")} />
          Sincronizar Status
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
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
      )}
    </AdminLayout>
  );
};

export default AdminWhatsAppPage;
