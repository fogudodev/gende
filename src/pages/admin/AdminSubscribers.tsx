import AdminLayout from "@/components/layout/AdminLayout";
import { useAllProfessionals } from "@/hooks/useAdmin";
import { useState } from "react";
import { Search, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminSubscribers = () => {
  const { data: professionals, isLoading } = useAllProfessionals();
  const [filter, setFilter] = useState<"all" | "essencial" | "enterprise" | "none">("all");
  const [search, setSearch] = useState("");

  const allWithSub = (professionals || []).map(p => {
    const sub = Array.isArray(p.subscriptions) ? p.subscriptions[0] : p.subscriptions;
    return { ...p, sub };
  });

  const filtered = allWithSub
    .filter(p => {
      if (filter === "all") return true;
      return (p.sub?.plan_id || "none") === filter;
    })
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
    );

  const counts = {
    all: allWithSub.length,
    essencial: allWithSub.filter(p => p.sub?.plan_id === "essencial").length,
    enterprise: allWithSub.filter(p => p.sub?.plan_id === "enterprise").length,
    none: allWithSub.filter(p => !p.sub?.plan_id || p.sub.plan_id === "none" || p.sub.plan_id === "free").length,
  };

  return (
    <AdminLayout title="Assinantes" subtitle="Visão geral de assinaturas">
      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: counts.all, key: "all" as const },
              { label: "Essencial", value: counts.essencial, key: "essencial" as const },
              { label: "Enterprise", value: counts.enterprise, key: "enterprise" as const },
              { label: "Sem plano", value: counts.none, key: "none" as const },
            ].map(c => (
              <button
                key={c.key}
                onClick={() => setFilter(c.key)}
                className={cn(
                  "glass-card rounded-xl p-4 text-left transition-all",
                  filter === c.key && "ring-1 ring-accent"
                )}
              >
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold text-foreground">{c.value}</p>
              </button>
            ))}
          </div>

          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-muted-foreground font-medium">Nome</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Email</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Plano</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left p-4 text-muted-foreground font-medium">Válido até</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-foreground">{p.name || p.business_name || "—"}</td>
                      <td className="p-4 text-muted-foreground">{p.email}</td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          p.sub?.plan_id === "enterprise" ? "bg-accent/10 text-accent" :
                          p.sub?.plan_id === "essencial" ? "bg-blue-500/10 text-blue-500" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {(p.sub?.plan_id || "none").toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-semibold",
                          p.sub?.status === "active" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                        )}>
                          {p.sub?.status || "—"}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {p.sub?.current_period_end
                          ? format(new Date(p.sub.current_period_end), "dd/MM/yy", { locale: ptBR })
                          : "—"
                        }
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

export default AdminSubscribers;
