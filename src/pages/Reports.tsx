import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Scissors } from "lucide-react";

const Reports = () => {
  return (
    <DashboardLayout title="Relatórios" subtitle="Análises e métricas do negócio">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { icon: BarChart3, title: "Receita por Período", description: "Análise detalhada de faturamento" },
          { icon: TrendingUp, title: "Taxa de Conversão", description: "Agendamentos vs confirmações" },
          { icon: Users, title: "Retenção de Clientes", description: "Frequência e recorrência" },
          { icon: Scissors, title: "Serviços Populares", description: "Ranking de serviços mais agendados" },
        ].map((report, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass-card rounded-2xl p-8 cursor-pointer hover-lift group"
          >
            <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center mb-5 stat-glow">
              <report.icon size={24} className="text-accent-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">{report.title}</h3>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
