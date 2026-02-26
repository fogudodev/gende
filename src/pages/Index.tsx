import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import HeroSection from "@/components/dashboard/HeroSection";
import CustomerJourney from "@/components/dashboard/CustomerJourney";
import ServicesOverview from "@/components/dashboard/ServicesOverview";
import TicketsChart from "@/components/dashboard/TicketsChart";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

const Index = () => {
  const { data: stats } = useDashboardStats();

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR")}`;
  const pct = (v: number) => `${v >= 0 ? "+" : ""}${v}%`;

  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral do seu negócio">
      <div className="space-y-4 md:space-y-6 lg:space-y-8">
        {/* Hero */}
        <HeroSection />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          <StatsCard title="Receita Hoje" value={stats ? fmt(stats.todayRevenue) : "—"} change={stats ? `${pct(stats.revenueTodayChange)} vs ontem` : ""} changeType={stats && stats.revenueTodayChange >= 0 ? "positive" : "negative"} icon={DollarSign} delay={0} />
          <StatsCard title="Receita Mês" value={stats ? fmt(stats.monthRevenue) : "—"} change={stats ? `${pct(stats.revenueMonthChange)} vs anterior` : ""} changeType={stats && stats.revenueMonthChange >= 0 ? "positive" : "negative"} icon={TrendingUp} delay={0.1} />
          <StatsCard title="Agend. Hoje" value={stats ? String(stats.todayCount) : "—"} change={stats ? `${stats.todayPending} pendentes` : ""} changeType="neutral" icon={CalendarDays} delay={0.15} />
          <StatsCard title="Clientes" value={stats ? String(stats.totalClients) : "—"} change={stats ? `+${stats.weekClients} semana` : ""} changeType="positive" icon={Users} delay={0.2} />
        </div>

        {/* Customer Journey */}
        <CustomerJourney />

        {/* Services + Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
          <div className="xl:col-span-3">
            <RevenueChart />
          </div>
          <div className="xl:col-span-2">
            <TodaySchedule />
          </div>
        </div>

        <ServicesOverview />
        <TicketsChart />
      </div>
    </DashboardLayout>
  );
};

export default Index;
