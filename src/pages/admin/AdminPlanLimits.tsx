import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { usePlanLimits, useUpdatePlanLimits } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const planLabels: Record<string, string> = {
  essencial: "Essencial",
  enterprise: "Enterprise",
  // Legacy fallbacks
  free: "Free (legado)",
  starter: "Starter (legado)",
  pro: "Pro (legado)",
};

const AdminPlanLimits = () => {
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

  // Only show Essencial and Enterprise plans
  const relevantPlans = (planLimits || []).filter((p: any) =>
    p.plan_id === "essencial" || p.plan_id === "enterprise"
  );

  return (
    <AdminLayout title="Limites de Plano" subtitle="Configure os limites de mensagens por plano">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use <strong className="text-foreground">-1</strong> para ilimitado.
          </p>

          {relevantPlans.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">
              Nenhum plano encontrado. Adicione registros para "essencial" e "enterprise" na tabela plan_limits.
            </div>
          )}

          {relevantPlans.map((plan: any) => {
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
      )}
    </AdminLayout>
  );
};

export default AdminPlanLimits;
