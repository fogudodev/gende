import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Scissors, Calendar, DollarSign, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { useExpenses } from "@/hooks/useExpenses";
import { useProfessional } from "@/hooks/useProfessional";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, subDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";

type Tab = "revenue" | "conversion" | "retention" | "services";

const COLORS = ["hsl(336, 100%, 50%)", "hsl(210, 70%, 55%)", "hsl(150, 60%, 45%)", "hsl(40, 90%, 55%)", "hsl(280, 60%, 55%)", "hsl(15, 80%, 55%)"];

const Reports = () => {
  const { data: professional } = useProfessional();
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: clients } = useClients();
  const { data: services } = useServices();
  const { data: expenses } = useExpenses();
  const [tab, setTab] = useState<Tab>("revenue");

  const isLoading = loadingBookings;

  // === REVENUE DATA ===
  const revenueData = useMemo(() => {
    if (!bookings) return { monthly: [], total: 0, lastMonthTotal: 0, avgMonthly: 0 };
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });

    const monthly = months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthBookings = bookings.filter(b =>
        (b.status === "confirmed" || b.status === "completed") &&
        new Date(b.start_time) >= start && new Date(b.start_time) <= end
      );
      const revenue = monthBookings.reduce((s, b) => s + Number(b.price), 0);
      const monthExpenses = (expenses || []).filter(e =>
        new Date(e.expense_date) >= start && new Date(e.expense_date) <= end
      ).reduce((s, e) => s + Number(e.amount), 0);

      return {
        name: format(m, "MMM", { locale: ptBR }),
        receita: revenue,
        despesas: monthExpenses,
        lucro: revenue - monthExpenses,
      };
    });

    const total = monthly.reduce((s, m) => s + m.receita, 0);
    const lastMonthTotal = monthly.length >= 2 ? monthly[monthly.length - 2].receita : 0;
    const currentMonth = monthly[monthly.length - 1]?.receita || 0;
    const avgMonthly = monthly.length > 0 ? Math.round(total / monthly.length) : 0;

    return { monthly, total, lastMonthTotal, currentMonth, avgMonthly };
  }, [bookings, expenses]);

  // === CONVERSION DATA ===
  const conversionData = useMemo(() => {
    if (!bookings) return { rate: 0, confirmed: 0, cancelled: 0, noShow: 0, pending: 0, byMonth: [] };
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });

    const confirmed = bookings.filter(b => b.status === "confirmed" || b.status === "completed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const noShow = bookings.filter(b => b.status === "no_show").length;
    const pending = bookings.filter(b => b.status === "pending").length;
    const total = bookings.length;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    const byMonth = months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const mb = bookings.filter(b => new Date(b.start_time) >= start && new Date(b.start_time) <= end);
      const conf = mb.filter(b => b.status === "confirmed" || b.status === "completed").length;
      return {
        name: format(m, "MMM", { locale: ptBR }),
        confirmados: conf,
        cancelados: mb.filter(b => b.status === "cancelled").length,
        taxa: mb.length > 0 ? Math.round((conf / mb.length) * 100) : 0,
      };
    });

    return { rate, confirmed, cancelled, noShow, pending, byMonth };
  }, [bookings]);

  // === RETENTION DATA ===
  const retentionData = useMemo(() => {
    if (!bookings || !clients) return { returningRate: 0, avgFrequency: 0, topClients: [], newVsReturning: [] };

    const clientBookings: Record<string, number> = {};
    bookings.filter(b => b.client_id && (b.status === "confirmed" || b.status === "completed"))
      .forEach(b => { clientBookings[b.client_id!] = (clientBookings[b.client_id!] || 0) + 1; });

    const totalWithBookings = Object.keys(clientBookings).length;
    const returning = Object.values(clientBookings).filter(c => c > 1).length;
    const returningRate = totalWithBookings > 0 ? Math.round((returning / totalWithBookings) * 100) : 0;
    const avgFrequency = totalWithBookings > 0 ? +(Object.values(clientBookings).reduce((s, c) => s + c, 0) / totalWithBookings).toFixed(1) : 0;

    const topClients = Object.entries(clientBookings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([clientId, count]) => {
        const client = clients.find(c => c.id === clientId);
        return { name: client?.name || "—", visits: count };
      });

    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    const newVsReturning = months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const newClients = (clients || []).filter(c => new Date(c.created_at) >= start && new Date(c.created_at) <= end).length;
      const monthBk = bookings.filter(b => b.client_id && new Date(b.start_time) >= start && new Date(b.start_time) <= end && (b.status === "confirmed" || b.status === "completed"));
      const uniqueClients = new Set(monthBk.map(b => b.client_id)).size;
      return { name: format(m, "MMM", { locale: ptBR }), novos: newClients, recorrentes: Math.max(0, uniqueClients - newClients) };
    });

    return { returningRate, avgFrequency, topClients, newVsReturning };
  }, [bookings, clients]);

  // === SERVICES DATA ===
  const servicesData = useMemo(() => {
    if (!bookings || !services) return { ranking: [], pieData: [] };
    const serviceCounts: Record<string, { count: number; revenue: number; name: string }> = {};
    bookings.filter(b => b.service_id && (b.status === "confirmed" || b.status === "completed"))
      .forEach(b => {
        const svc = services.find(s => s.id === b.service_id);
        const name = svc?.name || "Outro";
        if (!serviceCounts[b.service_id!]) serviceCounts[b.service_id!] = { count: 0, revenue: 0, name };
        serviceCounts[b.service_id!].count++;
        serviceCounts[b.service_id!].revenue += Number(b.price);
      });

    const ranking = Object.values(serviceCounts).sort((a, b) => b.count - a.count);
    const pieData = ranking.slice(0, 6).map((s, i) => ({ name: s.name, value: s.count, fill: COLORS[i % COLORS.length] }));

    return { ranking, pieData };
  }, [bookings, services]);

  const tabs = [
    { id: "revenue" as Tab, icon: BarChart3, label: "Receita" },
    { id: "conversion" as Tab, icon: TrendingUp, label: "Conversão" },
    { id: "retention" as Tab, icon: Users, label: "Retenção" },
    { id: "services" as Tab, icon: Scissors, label: "Serviços" },
  ];

  return (
    <DashboardLayout title="Relatórios" subtitle="Análises e métricas do negócio">
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === t.id ? "gradient-accent text-accent-foreground" : "glass-card text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" size={32} /></div>
      ) : (
        <>
          {tab === "revenue" && <RevenueTab data={revenueData} />}
          {tab === "conversion" && <ConversionTab data={conversionData} />}
          {tab === "retention" && <RetentionTab data={retentionData} />}
          {tab === "services" && <ServicesTab data={servicesData} />}
        </>
      )}
    </DashboardLayout>
  );
};

const StatCard = ({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) => (
  <div className="glass-card rounded-2xl p-5">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-xl font-bold text-foreground">{value}</p>
    {sub && <p className={cn("text-xs mt-1", positive === undefined ? "text-muted-foreground" : positive ? "text-success" : "text-destructive")}>{sub}</p>}
  </div>
);

const chartTooltipStyle = {
  background: "hsla(0, 0%, 7%, 0.95)",
  backdropFilter: "blur(12px)",
  border: "1px solid hsla(0, 0%, 100%, 0.1)",
  borderRadius: "12px",
  color: "hsl(0, 0%, 95%)",
  fontSize: "12px",
};

const RevenueTab = ({ data }: { data: any }) => {
  const change = data.lastMonthTotal > 0 ? Math.round(((data.currentMonth - data.lastMonthTotal) / data.lastMonthTotal) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Receita Total (6m)" value={`R$ ${data.total.toLocaleString("pt-BR")}`} />
        <StatCard label="Mês Atual" value={`R$ ${(data.currentMonth || 0).toLocaleString("pt-BR")}`} sub={`${change >= 0 ? "+" : ""}${change}% vs anterior`} positive={change >= 0} />
        <StatCard label="Média Mensal" value={`R$ ${data.avgMonthly.toLocaleString("pt-BR")}`} />
        <StatCard label="Despesas (6m)" value={`R$ ${data.monthly.reduce((s: number, m: any) => s + m.despesas, 0).toLocaleString("pt-BR")}`} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs Despesas (últimos 6 meses)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR")}`, name === "receita" ? "Receita" : name === "despesas" ? "Despesas" : "Lucro"]} />
            <Bar dataKey="receita" fill="hsl(336, 100%, 50%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="despesas" fill="hsl(0, 60%, 50%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="lucro" fill="hsl(150, 60%, 45%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

const ConversionTab = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard label="Taxa de Conversão" value={`${data.rate}%`} sub="confirmados / total" />
      <StatCard label="Confirmados" value={String(data.confirmed)} />
      <StatCard label="Cancelados" value={String(data.cancelled)} />
      <StatCard label="No-show" value={String(data.noShow)} />
    </div>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Confirmados vs Cancelados por Mês</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.byMonth}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="confirmados" fill="hsl(150, 60%, 45%)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="cancelados" fill="hsl(0, 60%, 50%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  </div>
);

const RetentionTab = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <StatCard label="Taxa de Retorno" value={`${data.returningRate}%`} sub="clientes com 2+ visitas" />
      <StatCard label="Frequência Média" value={`${data.avgFrequency}x`} sub="visitas por cliente" />
      <StatCard label="Top Clientes" value={String(data.topClients.length)} />
    </div>
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
      <h3 className="text-sm font-semibold text-foreground mb-4">Novos vs Recorrentes por Mês</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data.newVsReturning}>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="novos" fill="hsl(210, 70%, 55%)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="recorrentes" fill="hsl(336, 100%, 50%)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
    {data.topClients.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Top 10 Clientes Frequentes</h3>
        </div>
        {data.topClients.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between px-6 py-3 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
              <span className="text-sm font-medium text-foreground">{c.name}</span>
            </div>
            <span className="text-sm text-accent font-semibold">{c.visits} visitas</span>
          </div>
        ))}
      </motion.div>
    )}
  </div>
);

const ServicesTab = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Serviços</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {data.pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v} agendamentos`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {data.pieData.map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                {d.name}
              </div>
            ))}
          </div>
        </motion.div>
      )}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Ranking de Serviços</h3>
        </div>
        {data.ranking.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Sem dados</p>
        ) : (
          data.ranking.map((s: any, i: number) => (
            <div key={i} className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}.</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.count} agendamentos</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">R$ {s.revenue.toLocaleString("pt-BR")}</span>
            </div>
          ))
        )}
      </motion.div>
    </div>
  </div>
);

export default Reports;
