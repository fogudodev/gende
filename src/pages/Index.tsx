import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const Index = () => {
  const { data: stats } = useDashboardStats();

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;
  const pct = (v: number) => `${v >= 0 ? "+" : ""}${v}%`;

  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral do seu negócio">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatsCard title="Receita Hoje" value={stats ? fmt(stats.todayRevenue) : "—"} change={stats ? `${pct(stats.revenueTodayChange)} vs ontem` : ""} changeType={stats && stats.revenueTodayChange >= 0 ? "positive" : "negative"} icon={DollarSign} delay={0} />
        <StatsCard title="Receita do Mês" value={stats ? fmt(stats.monthRevenue) : "—"} change={stats ? `${pct(stats.revenueMonthChange)} vs mês anterior` : ""} changeType={stats && stats.revenueMonthChange >= 0 ? "positive" : "negative"} icon={TrendingUp} delay={0.1} />
        <StatsCard title="Agendamentos Hoje" value={stats ? String(stats.todayCount) : "—"} change={stats ? `${stats.todayPending} pendentes` : ""} changeType="neutral" icon={CalendarDays} delay={0.15} />
        <StatsCard title="Clientes Ativos" value={stats ? String(stats.totalClients) : "—"} change={stats ? `+${stats.weekClients} esta semana` : ""} changeType="positive" icon={Users} delay={0.2} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3">
          <RevenueChart />
        </div>
        <div className="xl:col-span-2">
          <TodaySchedule />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
