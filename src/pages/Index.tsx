import DashboardLayout from "@/components/layout/DashboardLayout";
import StatsCard from "@/components/dashboard/StatsCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import { DollarSign, CalendarDays, Users, TrendingUp } from "lucide-react";

const Index = () => {
  return (
    <DashboardLayout title="Dashboard" subtitle="Visão geral do seu negócio">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Receita Hoje"
          value="R$ 1.280"
          change="+12% vs ontem"
          changeType="positive"
          icon={DollarSign}
          delay={0}
        />
        <StatsCard
          title="Receita do Mês"
          value="R$ 18.450"
          change="+23% vs mês anterior"
          changeType="positive"
          icon={TrendingUp}
          delay={0.1}
        />
        <StatsCard
          title="Agendamentos Hoje"
          value="12"
          change="3 pendentes"
          changeType="neutral"
          icon={CalendarDays}
          delay={0.15}
        />
        <StatsCard
          title="Clientes Ativos"
          value="284"
          change="+8 esta semana"
          changeType="positive"
          icon={Users}
          delay={0.2}
        />
      </div>

      {/* Charts + Schedule */}
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
