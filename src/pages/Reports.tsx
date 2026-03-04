import { useState, useMemo, useRef, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Scissors, Loader2, Download, CalendarIcon } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useClients } from "@/hooks/useClients";
import { useServices } from "@/hooks/useServices";
import { useExpenses } from "@/hooks/useExpenses";
import { format, subMonths, subWeeks, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Tab = "revenue" | "conversion" | "retention" | "services";
type Period = "week" | "month" | "quarter" | "semester" | "year";

type Booking = Tables<"bookings">;
type Client = Tables<"clients">;
type Expense = Tables<"expenses">;

interface ServiceCount {
  count: number;
  revenue: number;
  name: string;
}

interface MonthlyRevenue {
  name: string;
  receita: number;
  despesas: number;
  lucro: number;
}

interface RevenueData {
  monthly: MonthlyRevenue[];
  total: number;
  lastMonthTotal: number;
  currentMonth: number;
  avgMonthly: number;
}

interface ConversionMonth {
  name: string;
  confirmados: number;
  cancelados: number;
  taxa: number;
}

interface ConversionData {
  rate: number;
  confirmed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  byMonth: ConversionMonth[];
}

interface TopClient {
  name: string;
  visits: number;
}

interface NewVsReturning {
  name: string;
  novos: number;
  recorrentes: number;
}

interface RetentionData {
  returningRate: number;
  avgFrequency: number;
  topClients: TopClient[];
  newVsReturning: NewVsReturning[];
}

interface PieEntry {
  name: string;
  value: number;
  fill: string;
}

interface ServicesReportData {
  ranking: ServiceCount[];
  pieData: PieEntry[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(150, 60%, 45%)",
  "hsl(40, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(15, 80%, 55%)",
];

const PERIOD_MONTHS: Record<Period, number> = {
  week: 0,
  month: 1,
  quarter: 3,
  semester: 6,
  year: 12,
};

const PERIOD_LABELS: Record<Period, string> = {
  week: "Última Semana",
  month: "Último Mês",
  quarter: "Último Trimestre",
  semester: "Último Semestre",
  year: "Último Ano",
};

function getPeriodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === "week") return { start: subWeeks(now, 1), end: now };
  return { start: subMonths(now, PERIOD_MONTHS[period]), end: now };
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

const Reports = () => {
  const { data: bookings, isLoading: loadingBookings } = useBookings();
  const { data: clients } = useClients();
  const { data: services } = useServices();
  const { data: expenses } = useExpenses();
  const [tab, setTab] = useState<Tab>("revenue");
  const [period, setPeriod] = useState<Period>("semester");
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const isLoading = loadingBookings;

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter(
      (b) => new Date(b.start_time) >= periodRange.start && new Date(b.start_time) <= periodRange.end
    );
  }, [bookings, periodRange]);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    return expenses.filter(
      (e) => new Date(e.expense_date) >= periodRange.start && new Date(e.expense_date) <= periodRange.end
    );
  }, [expenses, periodRange]);

  const handleExportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const element = reportRef.current;

      const isDark = document.documentElement.classList.contains("dark");
      const bgColor = isDark ? "#09090B" : "#FFFFFF";

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: bgColor,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const tabLabel =
        tab === "revenue" ? "Receita" : tab === "conversion" ? "Conversao" : tab === "retention" ? "Retencao" : "Servicos";
      pdf.save(`Relatorio_${tabLabel}_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Erro ao exportar PDF. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }, [tab]);

  // === REVENUE DATA ===
  const revenueData = useMemo((): RevenueData => {
    if (!filteredBookings.length) return { monthly: [], total: 0, lastMonthTotal: 0, currentMonth: 0, avgMonthly: 0 };
    const now = new Date();
    const monthsBack = period === "week" ? 1 : PERIOD_MONTHS[period];
    const months = eachMonthOfInterval({ start: subMonths(now, Math.max(monthsBack - 1, 0)), end: now });

    const monthly: MonthlyRevenue[] = months.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const monthBookings = filteredBookings.filter(
        (b) =>
          (b.status === "confirmed" || b.status === "completed") &&
          new Date(b.start_time) >= start &&
          new Date(b.start_time) <= end
      );
      const revenue = monthBookings.reduce((s, b) => s + Number(b.price), 0);
      const monthExp = filteredExpenses
        .filter((e) => new Date(e.expense_date) >= start && new Date(e.expense_date) <= end)
        .reduce((s, e) => s + Number(e.amount), 0);

      return {
        name: format(m, "MMM", { locale: ptBR }),
        receita: revenue,
        despesas: monthExp,
        lucro: revenue - monthExp,
      };
    });

    const total = monthly.reduce((s, m) => s + m.receita, 0);
    const lastMonthTotal = monthly.length >= 2 ? monthly[monthly.length - 2].receita : 0;
    const currentMonth = monthly[monthly.length - 1]?.receita || 0;
    const avgMonthly = monthly.length > 0 ? Math.round(total / monthly.length) : 0;

    return { monthly, total, lastMonthTotal, currentMonth, avgMonthly };
  }, [filteredBookings, filteredExpenses, period]);

  // === CONVERSION DATA ===
  const conversionData = useMemo((): ConversionData => {
    if (!filteredBookings.length) return { rate: 0, confirmed: 0, cancelled: 0, noShow: 0, pending: 0, byMonth: [] };
    const now = new Date();
    const monthsBack = period === "week" ? 1 : PERIOD_MONTHS[period];
    const months = eachMonthOfInterval({ start: subMonths(now, Math.max(monthsBack - 1, 0)), end: now });

    const confirmed = filteredBookings.filter((b) => b.status === "confirmed" || b.status === "completed").length;
    const cancelled = filteredBookings.filter((b) => b.status === "cancelled").length;
    const noShow = filteredBookings.filter((b) => b.status === "no_show").length;
    const pending = filteredBookings.filter((b) => b.status === "pending").length;
    const total = filteredBookings.length;
    const rate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    const byMonth: ConversionMonth[] = months.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const mb = filteredBookings.filter((b) => new Date(b.start_time) >= start && new Date(b.start_time) <= end);
      const conf = mb.filter((b) => b.status === "confirmed" || b.status === "completed").length;
      return {
        name: format(m, "MMM", { locale: ptBR }),
        confirmados: conf,
        cancelados: mb.filter((b) => b.status === "cancelled").length,
        taxa: mb.length > 0 ? Math.round((conf / mb.length) * 100) : 0,
      };
    });

    return { rate, confirmed, cancelled, noShow, pending, byMonth };
  }, [filteredBookings, period]);

  // === RETENTION DATA ===
  const retentionData = useMemo((): RetentionData => {
    if (!filteredBookings.length || !clients)
      return { returningRate: 0, avgFrequency: 0, topClients: [], newVsReturning: [] };

    const clientBookings: Record<string, number> = {};
    filteredBookings
      .filter((b) => b.client_id && (b.status === "confirmed" || b.status === "completed"))
      .forEach((b) => {
        clientBookings[b.client_id!] = (clientBookings[b.client_id!] || 0) + 1;
      });

    const totalWithBookings = Object.keys(clientBookings).length;
    const returning = Object.values(clientBookings).filter((c) => c > 1).length;
    const returningRate = totalWithBookings > 0 ? Math.round((returning / totalWithBookings) * 100) : 0;
    const avgFrequency =
      totalWithBookings > 0
        ? +(Object.values(clientBookings).reduce((s, c) => s + c, 0) / totalWithBookings).toFixed(1)
        : 0;

    const topClients: TopClient[] = Object.entries(clientBookings)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([clientId, count]) => {
        const client = clients.find((c) => c.id === clientId);
        return { name: client?.name || "—", visits: count };
      });

    const now = new Date();
    const monthsBack = period === "week" ? 1 : PERIOD_MONTHS[period];
    const months = eachMonthOfInterval({ start: subMonths(now, Math.max(monthsBack - 1, 0)), end: now });
    const newVsReturning: NewVsReturning[] = months.map((m) => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const newClients = (clients || []).filter(
        (c) => new Date(c.created_at) >= start && new Date(c.created_at) <= end
      ).length;
      const monthBk = filteredBookings.filter(
        (b) =>
          b.client_id &&
          new Date(b.start_time) >= start &&
          new Date(b.start_time) <= end &&
          (b.status === "confirmed" || b.status === "completed")
      );
      const uniqueClients = new Set(monthBk.map((b) => b.client_id)).size;
      return {
        name: format(m, "MMM", { locale: ptBR }),
        novos: newClients,
        recorrentes: Math.max(0, uniqueClients - newClients),
      };
    });

    return { returningRate, avgFrequency, topClients, newVsReturning };
  }, [filteredBookings, clients, period]);

  // === SERVICES DATA ===
  const servicesData = useMemo((): ServicesReportData => {
    if (!filteredBookings.length || !services) return { ranking: [], pieData: [] };
    const serviceCounts: Record<string, ServiceCount> = {};
    filteredBookings
      .filter((b) => b.service_id && (b.status === "confirmed" || b.status === "completed"))
      .forEach((b) => {
        const svc = services.find((s) => s.id === b.service_id);
        const name = svc?.name || "Outro";
        if (!serviceCounts[b.service_id!]) serviceCounts[b.service_id!] = { count: 0, revenue: 0, name };
        serviceCounts[b.service_id!].count++;
        serviceCounts[b.service_id!].revenue += Number(b.price);
      });

    const ranking = Object.values(serviceCounts).sort((a, b) => b.count - a.count);
    const pieData: PieEntry[] = ranking
      .slice(0, 6)
      .map((s, i) => ({ name: s.name, value: s.count, fill: COLORS[i % COLORS.length] }));

    return { ranking, pieData };
  }, [filteredBookings, services]);

  const tabs = [
    { id: "revenue" as Tab, icon: BarChart3, label: "Receita" },
    { id: "conversion" as Tab, icon: TrendingUp, label: "Conversão" },
    { id: "retention" as Tab, icon: Users, label: "Retenção" },
    { id: "services" as Tab, icon: Scissors, label: "Serviços" },
  ];

  return (
    <DashboardLayout title="Relatórios" subtitle="Análises e métricas do negócio">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((t) => (
            <Button
              key={t.id}
              variant={tab === t.id ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(t.id)}
              className="gap-2"
            >
              <t.icon size={16} />
              {t.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px] h-9">
              <CalendarIcon size={14} className="mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PERIOD_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isLoading || exporting} className="gap-2">
            {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div ref={reportRef}>
          {tab === "revenue" && <RevenueTab data={revenueData} periodLabel={PERIOD_LABELS[period]} />}
          {tab === "conversion" && <ConversionTab data={conversionData} />}
          {tab === "retention" && <RetentionTab data={retentionData} />}
          {tab === "services" && <ServicesTab data={servicesData} />}
        </div>
      )}
    </DashboardLayout>
  );
};

const StatCard = ({ label, value, sub, positive }: { label: string; value: string; sub?: string; positive?: boolean }) => (
  <div className="glass-card rounded-2xl p-5">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    <p className="text-xl font-bold text-foreground">{value}</p>
    {sub && (
      <p
        className={cn(
          "text-xs mt-1",
          positive === undefined ? "text-muted-foreground" : positive ? "text-success" : "text-destructive"
        )}
      >
        {sub}
      </p>
    )}
  </div>
);

const chartTooltipStyle = {
  background: "hsl(var(--card))",
  backdropFilter: "blur(12px)",
  border: "1px solid hsl(var(--border))",
  borderRadius: "12px",
  color: "hsl(var(--foreground))",
  fontSize: "12px",
};

const RevenueTab = ({ data, periodLabel }: { data: RevenueData; periodLabel: string }) => {
  const change =
    data.lastMonthTotal > 0
      ? Math.round(((data.currentMonth - data.lastMonthTotal) / data.lastMonthTotal) * 100)
      : data.currentMonth > 0
        ? 100
        : 0;
  const changeSub =
    data.lastMonthTotal === 0 && data.currentMonth === 0
      ? "Sem dados anteriores"
      : `${change >= 0 ? "+" : ""}${change}% vs anterior`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={`Receita Total (${periodLabel})`} value={formatCurrency(data.total)} />
        <StatCard
          label="Mês Atual"
          value={formatCurrency(data.currentMonth)}
          sub={changeSub}
          positive={data.lastMonthTotal === 0 && data.currentMonth === 0 ? undefined : change >= 0}
        />
        <StatCard label="Média Mensal" value={formatCurrency(data.avgMonthly)} />
        <StatCard
          label={`Despesas (${periodLabel})`}
          value={formatCurrency(data.monthly.reduce((s, m) => s + m.despesas, 0))}
        />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Receita vs Despesas</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data.monthly}>
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={chartTooltipStyle}
              formatter={(v: number, name: string) => [
                formatCurrency(v),
                name === "receita" ? "Receita" : name === "despesas" ? "Despesas" : "Lucro",
              ]}
            />
            <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="lucro" fill="hsl(150, 60%, 45%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
};

const ConversionTab = ({ data }: { data: ConversionData }) => (
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
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="confirmados" fill="hsl(150, 60%, 45%)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="cancelados" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  </div>
);

const RetentionTab = ({ data }: { data: RetentionData }) => (
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
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={chartTooltipStyle} />
          <Bar dataKey="novos" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
          <Bar dataKey="recorrentes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
    {data.topClients.length > 0 && (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="text-sm font-semibold text-foreground">Top 10 Clientes Frequentes</h3>
        </div>
        {data.topClients.map((c, i) => (
          <div key={c.name + i} className="flex items-center justify-between px-6 py-3 border-b border-border/30 last:border-0">
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

const ServicesTab = ({ data }: { data: ServicesReportData }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {data.pieData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição de Serviços</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={50}
                paddingAngle={3}
              >
                {data.pieData.map((entry, i) => (
                  <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`${v} agendamentos`]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-3 mt-2">
            {data.pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
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
          data.ranking.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 font-mono">{i + 1}.</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.count} agendamentos</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(s.revenue)}</span>
            </div>
          ))
        )}
      </motion.div>
    </div>
  </div>
);

export default Reports;
