import AdminLayout from "@/components/layout/AdminLayout";
import { useAllWhatsAppInstances } from "@/hooks/useAdmin";
import { Loader2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const AdminIntegrations = () => {
  const { data: instances, isLoading } = useAllWhatsAppInstances();

  const connected = (instances || []).filter(i => i.status === "connected").length;
  const total = (instances || []).length;

  return (
    <AdminLayout title="Integrações" subtitle="Status de integrações dos usuários">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">WhatsApp Conectados</span>
                <Wifi size={16} className="text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{connected}</p>
            </div>
            <div className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Desconectados</span>
                <WifiOff size={16} className="text-red-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{total - connected}</p>
            </div>
            <div className="glass-card rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Total Instâncias</span>
                <AlertTriangle size={16} className="text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{total}</p>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Instância</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Telefone</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(instances || []).map((inst) => (
                    <tr key={inst.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{inst.professionals?.name || "—"}</td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{inst.instance_name}</td>
                      <td className="p-4 text-muted-foreground">{inst.phone_number || "—"}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          inst.status === "connected" ? "bg-emerald-500/10 text-emerald-500" :
                          inst.status === "error" ? "bg-red-500/10 text-red-500" :
                          "bg-yellow-500/10 text-yellow-600"
                        )}>
                          {inst.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminIntegrations;
