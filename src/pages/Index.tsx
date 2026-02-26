import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import HeroSection from "@/components/dashboard/HeroSection";
import CustomerJourney from "@/components/dashboard/CustomerJourney";
import ServicesOverview from "@/components/dashboard/ServicesOverview";
import TicketsChart from "@/components/dashboard/TicketsChart";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral do seu negócio">
      <div className="space-y-4 md:space-y-6">
        {/* Hero */}
        <HeroSection />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatsCard title="Receita Hoje" value="R$ 1.580" change="+23% vs ontem" changeType="positive" icon={DollarSign} delay={0} />
          <StatsCard title="Receita Mês" value="R$ 18.450" change="+12% vs anterior" changeType="positive" icon={TrendingUp} delay={0.1} />
          <StatsCard title="Agend. Hoje" value="8" change="3 pendentes" changeType="neutral" icon={CalendarDays} delay={0.15} />
          <StatsCard title="Clientes" value="147" change="+9 semana" changeType="positive" icon={Users} delay={0.2} />
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

        {/* Services + Charts */}
        <ServicesOverview />
        <TicketsChart />
      </div>
    </DashboardLayout>
  );
};

export default Index;
