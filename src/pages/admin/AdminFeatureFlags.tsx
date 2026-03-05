import AdminLayout from "@/components/layout/AdminLayout";
import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/useFeatureFlags";
import { Loader2, ToggleLeft, ToggleRight, Sparkles, DollarSign, Cog, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  experiência: { label: "Experiência do Cliente", icon: Sparkles, color: "text-blue-400" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "text-emerald-400" },
  operacional: { label: "Operacional", icon: Cog, color: "text-orange-400" },
  automação: { label: "Automação", icon: Zap, color: "text-purple-400" },
  geral: { label: "Geral", icon: Cog, color: "text-muted-foreground" },
};

const AdminFeatureFlags = () => {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleMutation = useToggleFeatureFlag();

  const grouped = (flags || []).reduce<Record<string, typeof flags>>((acc, flag) => {
    const cat = flag.category || "geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(flag);
    return acc;
  }, {});

  return (
    <AdminLayout title="Feature Flags" subtitle="Controle o lançamento de funcionalidades para os usuários">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {Object.entries(grouped).map(([category, categoryFlags]) => {
            const config = categoryConfig[category] || categoryConfig.geral;
            const Icon = config.icon;
            return (
              <div key={category} className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Icon size={18} className={config.color} />
                  <h2 className="font-semibold text-foreground">{config.label}</h2>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {categoryFlags!.filter(f => f.enabled).length}/{categoryFlags!.length} ativas
                  </span>
                </div>
                <div className="space-y-2">
                  {categoryFlags!.map((flag) => (
                    <div
                      key={flag.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                        flag.enabled
                          ? "border-accent/30 bg-accent/5"
                          : "border-border bg-muted/30"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{flag.label}</span>
                          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {flag.key}
                          </code>
                        </div>
                        {flag.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleMutation.mutate({ id: flag.id, enabled: !flag.enabled })}
                        disabled={toggleMutation.isPending}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ml-3 shrink-0",
                          flag.enabled
                            ? "bg-accent text-accent-foreground hover:bg-accent/80"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {flag.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {flag.enabled ? "Ativa" : "Inativa"}
                      </button>
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

export default AdminFeatureFlags;
