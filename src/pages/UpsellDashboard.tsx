import { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfessional } from "@/hooks/useProfessional";
import { useServices } from "@/hooks/useServices";
import { useUpsellEvents, useUpsellRules } from "@/hooks/useUpsell";
import { Loader2, TrendingUp, Target, DollarSign, BarChart3 } from "lucide-react";

const UpsellDashboard = () => {
  const { data: professional } = useProfessional();
  const { data: events, isLoading: eventsLoading } = useUpsellEvents(professional?.id);
  const { data: rules, isLoading: rulesLoading } = useUpsellRules(professional?.id);
  const { data: services } = useServices();

  const isLoading = eventsLoading || rulesLoading;

  const serviceMap = useMemo(() => {
    const map: Record<string, string> = {};
    (services || []).forEach(s => { map[s.id] = s.name; });
    return map;
  }, [services]);

  const stats = useMemo(() => {
    const allEvents = events || [];
    const suggested = allEvents.filter(e => e.status === "suggested").length;
    const accepted = allEvents.filter(e => e.status === "accepted").length;
    const totalRevenue = allEvents.filter(e => e.status === "accepted").reduce((sum, e) => sum + (e.upsell_revenue || 0), 0);
    const conversionRate = suggested > 0 ? Math.round((accepted / suggested) * 100) : 0;

    // Top combos
    const comboMap: Record<string, { source: string; rec: string; count: number; revenue: number }> = {};
    allEvents.filter(e => e.status === "accepted").forEach(e => {
      const key = `${e.source_service_id}:${e.recommended_service_id}`;
      if (!comboMap[key]) {
        comboMap[key] = {
          source: serviceMap[e.source_service_id || ""] || "—",
          rec: serviceMap[e.recommended_service_id || ""] || "—",
          count: 0,
          revenue: 0,
        };
      }
      comboMap[key].count++;
      comboMap[key].revenue += e.upsell_revenue || 0;
    });
    const topCombos = Object.values(comboMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Monthly revenue
    const now = new Date();
    const thisMonth = allEvents.filter(e => {
      const d = new Date(e.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status === "accepted";
    });
    const monthlyRevenue = thisMonth.reduce((sum, e) => sum + (e.upsell_revenue || 0), 0);

    return { suggested, accepted, totalRevenue, conversionRate, topCombos, monthlyRevenue };
  }, [events, serviceMap]);

  return (
    <DashboardLayout title="Upsell Inteligente" subtitle="Acompanhe o desempenho das sugestões de serviços">
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Target} label="Sugestões" value={String(stats.suggested)} color="text-blue-400" />
            <StatCard icon={TrendingUp} label="Aceitas" value={String(stats.accepted)} color="text-emerald-400" />
            <StatCard icon={BarChart3} label="Taxa de conversão" value={`${stats.conversionRate}%`} color="text-purple-400" />
            <StatCard icon={DollarSign} label="Receita este mês" value={`R$ ${stats.monthlyRevenue.toFixed(2)}`} color="text-amber-400" />
          </div>

          {/* Total revenue highlight */}
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-xs text-muted-foreground mb-1">Receita total gerada por Upsell</p>
            <p className="text-3xl font-bold text-accent">R$ {stats.totalRevenue.toFixed(2)}</p>
          </div>

          {/* Top combos */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-semibold text-foreground mb-3">Serviços mais vendidos juntos</h3>
            {stats.topCombos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado ainda. As métricas aparecerão após as primeiras conversões.</p>
            ) : (
              <div className="space-y-2">
                {stats.topCombos.map((combo, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{combo.source}</span>
                      <span className="text-accent">+</span>
                      <span className="font-medium text-accent">{combo.rec}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground">{combo.count}x</span>
                      <span className="text-xs text-muted-foreground ml-2">R$ {combo.revenue.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <div className="glass-card rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon size={16} className={color} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <p className="text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default UpsellDashboard;
