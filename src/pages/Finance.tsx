import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

const transactions = [
  { client: "Ana Silva", service: "Corte + Escova", amount: 120, date: "26/02", status: "paid" },
  { client: "Maria Santos", service: "Coloração", amount: 250, date: "25/02", status: "paid" },
  { client: "Julia Oliveira", service: "Manicure", amount: 45, date: "25/02", status: "pending" },
  { client: "Carla Lima", service: "Hidratação", amount: 120, date: "24/02", status: "paid" },
  { client: "Beatriz Costa", service: "Corte Masculino", amount: 50, date: "24/02", status: "refunded" },
];

const Finance = () => {
  return (
    <DashboardLayout title="Financeiro" subtitle="Receitas e transações">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "Receita do Mês", value: "R$ 18.450", change: "+23%", icon: TrendingUp, positive: true },
          { label: "Ticket Médio", value: "R$ 112", change: "+5%", icon: ArrowUpRight, positive: true },
          { label: "Cancelamentos", value: "R$ 380", change: "2.1%", icon: ArrowDownRight, positive: false },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon size={18} className={stat.positive ? "text-success" : "text-destructive"} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.positive ? "text-success" : "text-destructive"}`}>{stat.change}</p>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Transações Recentes</h3>
        </div>
        {transactions.map((t, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
                <CreditCard size={15} className="text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.client}</p>
                <p className="text-xs text-muted-foreground">{t.service}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">R$ {t.amount}</p>
              <p className="text-xs text-muted-foreground">{t.date}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </DashboardLayout>
  );
};

export default Finance;
