import AdminLayout from "@/components/layout/AdminLayout";
import { useAllProfessionals } from "@/hooks/useAdmin";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useAllProfessionalFeatures, useToggleProfessionalFeature } from "@/hooks/useProfessionalFeatures";
import { Loader2, ToggleLeft, ToggleRight, Search, Sparkles, DollarSign, Cog, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  experiência: { label: "Experiência", icon: Sparkles, color: "text-blue-400" },
  financeiro: { label: "Financeiro", icon: DollarSign, color: "text-emerald-400" },
  operacional: { label: "Operacional", icon: Cog, color: "text-orange-400" },
  automação: { label: "Automação", icon: Zap, color: "text-purple-400" },
  geral: { label: "Geral", icon: Cog, color: "text-muted-foreground" },
};

const AdminFeatures = () => {
  const { data: professionals, isLoading: profsLoading } = useAllProfessionals();
  const { data: flags, isLoading: flagsLoading } = useFeatureFlags();
  const { data: overrides, isLoading: overridesLoading } = useAllProfessionalFeatures();
  const toggleMutation = useToggleProfessionalFeature();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isLoading = profsLoading || flagsLoading || overridesLoading;

  // Build lookup: { "profId:featureKey" => enabled }
  const overrideLookup = useMemo(() => {
    const map: Record<string, boolean> = {};
    (overrides || []).forEach((o) => {
      map[`${o.professional_id}:${o.feature_key}`] = o.enabled;
    });
    return map;
  }, [overrides]);

  const getEnabled = (profId: string, featureKey: string) => {
    const key = `${profId}:${featureKey}`;
    if (key in overrideLookup) return overrideLookup[key];
    return true; // default enabled
  };

  const filteredProfessionals = useMemo(() => {
    if (!search.trim()) return professionals || [];
    const q = search.toLowerCase();
    return (professionals || []).filter(
      (p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.business_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q)
    );
  }, [professionals, search]);

  const groupedFlags = useMemo(() => {
    const groups: Record<string, typeof flags> = {};
    (flags || []).forEach((f) => {
      const cat = f.category || "geral";
      if (!groups[cat]) groups[cat] = [];
      groups[cat]!.push(f);
    });
    return groups;
  }, [flags]);

  const categories = Object.keys(groupedFlags);

  const visibleFlags = useMemo(() => {
    if (!selectedCategory) return flags || [];
    return (flags || []).filter((f) => f.category === selectedCategory);
  }, [flags, selectedCategory]);

  return (
    <AdminLayout title="Funcionalidades" subtitle="Controle de features por profissional">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar profissional..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  !selectedCategory
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                Todas
              </button>
              {categories.map((cat) => {
                const config = categoryConfig[cat] || categoryConfig.geral;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      selectedCategory === cat
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Counter */}
          <p className="text-xs text-muted-foreground">
            {filteredProfessionals.length} profissionais · {visibleFlags.length} funcionalidades
          </p>

          {/* Table */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-muted-foreground font-medium sticky left-0 bg-card z-10 min-w-[180px]">
                      Profissional
                    </th>
                    {visibleFlags.map((flag) => (
                      <th
                        key={flag.key}
                        className="text-center p-2 text-muted-foreground font-medium min-w-[90px]"
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[11px] leading-tight">{flag.label}</span>
                          <span
                            className={cn(
                              "text-[9px] px-1 rounded",
                              categoryConfig[flag.category]?.color || "text-muted-foreground"
                            )}
                          >
                            {categoryConfig[flag.category]?.label || flag.category}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredProfessionals.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3 sticky left-0 bg-card z-10">
                        <span className="font-medium text-foreground text-sm">
                          {p.name || p.business_name || "—"}
                        </span>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                          {p.email}
                        </p>
                      </td>
                      {visibleFlags.map((flag) => {
                        const enabled = getEnabled(p.id, flag.key);
                        return (
                          <td key={flag.key} className="p-2 text-center">
                            <button
                              onClick={() =>
                                toggleMutation.mutate({
                                  professionalId: p.id,
                                  featureKey: flag.key,
                                  enabled: !enabled,
                                })
                              }
                              disabled={toggleMutation.isPending}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all",
                                enabled
                                  ? "bg-accent/10 text-accent hover:bg-accent/20"
                                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                              )}
                            >
                              {enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
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
