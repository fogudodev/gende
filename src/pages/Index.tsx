import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import HeroSection from "@/components/dashboard/HeroSection";
import CustomerJourney from "@/components/dashboard/CustomerJourney";
import ServicesOverview from "@/components/dashboard/ServicesOverview";
import TicketsChart from "@/components/dashboard/TicketsChart";
import MessageUsage from "@/components/dashboard/MessageUsage";
import MobileDayOverview from "@/components/dashboard/MobileDayOverview";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Index = () => {
  const { data: stats } = useDashboardStats();
  const { enabled: mobileDashEnabled } = useIsFeatureEnabled("mobile_dashboard");

  const todayRevenue = stats?.todayRevenue ?? 0;
  const monthRevenue = stats?.monthRevenue ?? 0;
  const todayCount = stats?.todayCount ?? 0;
  const todayPending = stats?.todayPending ?? 0;
  const totalClients = stats?.totalClients ?? 0;
  const weekClients = stats?.weekClients ?? 0;
  const revenueTodayChange = stats?.revenueTodayChange ?? 0;
  const revenueMonthChange = stats?.revenueMonthChange ?? 0;

  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral do seu negócio">
      <div className="space-y-4 md:space-y-6">
        {/* Mobile Day Overview - replaces hero on mobile when enabled */}
        {mobileDashEnabled && <MobileDayOverview />}

        {/* Hero - hidden on mobile when mobile dashboard is active */}
        <div className={mobileDashEnabled ? "hidden md:block" : ""}>
          <HeroSection />
        </div>

        {/* Stats - hidden on mobile when mobile dashboard is active (already shown in overview) */}
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 ${mobileDashEnabled ? "hidden md:grid" : ""}`}>
          <StatsCard title="Receita Hoje" value={formatCurrency(todayRevenue)} change={`${revenueTodayChange >= 0 ? "+" : ""}${revenueTodayChange}% vs ontem`} changeType={revenueTodayChange >= 0 ? "positive" : "negative"} icon={DollarSign} delay={0} />
          <StatsCard title="Receita Mês" value={formatCurrency(monthRevenue)} change={`${revenueMonthChange >= 0 ? "+" : ""}${revenueMonthChange}% vs anterior`} changeType={revenueMonthChange >= 0 ? "positive" : "negative"} icon={TrendingUp} delay={0.1} />
          <StatsCard title="Agend. Hoje" value={String(todayCount)} change={`${todayPending} pendente${todayPending !== 1 ? "s" : ""}`} changeType="neutral" icon={CalendarDays} delay={0.15} />
          <StatsCard title="Clientes" value={String(totalClients)} change={`+${weekClients} semana`} changeType={weekClients > 0 ? "positive" : "neutral"} icon={Users} delay={0.2} />
        </div>

        {/* Customer Journey */}
        <CustomerJourney />

        {/* Revenue + Schedule */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 md:gap-6">
          <div className="xl:col-span-3">
            <RevenueChart />
          </div>
          <div className="xl:col-span-2">
            <TodaySchedule />
          </div>
        </div>

        {/* Message Usage */}
        <MessageUsage />

        {/* Services + Charts */}
        <ServicesOverview />
        <TicketsChart />
      </div>
    </DashboardLayout>
  );
};

export default Index;
