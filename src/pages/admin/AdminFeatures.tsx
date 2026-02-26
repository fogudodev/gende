import AdminLayout from "@/components/layout/AdminLayout";
import { useAllProfessionals } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Globe, MessageCircle, BarChart3, ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

const featureLabels: Record<string, { label: string; icon: any; description: string }> = {
  feature_whatsapp: { label: "WhatsApp", icon: MessageCircle, description: "Automações e lembretes via WhatsApp" },
  feature_public_page: { label: "Página Pública", icon: Globe, description: "Página de agendamento online" },
  feature_reports: { label: "Relatórios", icon: BarChart3, description: "Relatórios financeiros e de desempenho" },
};

const AdminFeatures = () => {
  const { data: professionals, isLoading } = useAllProfessionals();
  const qc = useQueryClient();

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

  return (
    <AdminLayout title="Funcionalidades" subtitle="Controle de features por profissional">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Profissional</th>
                    {Object.entries(featureLabels).map(([key, { label }]) => (
                      <th key={key} className="text-center p-4 text-muted-foreground font-medium">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(professionals || []).map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4">
                        <span className="font-medium text-foreground">{p.name || p.business_name || "—"}</span>
                        <p className="text-xs text-muted-foreground">{p.email}</p>
                      </td>
                      {Object.entries(featureLabels).map(([key, { icon: Icon }]) => {
                        const enabled = (p as any)[key] !== false;
                        return (
                          <td key={key} className="p-4 text-center">
                            <button
                              onClick={() => toggleFeature(p.id, key, enabled)}
                              className={cn(
                                "inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all",
                                enabled ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                          </td>
                        );
                      })}
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

export default AdminFeatures;
