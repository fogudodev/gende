import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format } from "date-fns";

const Finance = () => {
  const { data: stats } = useDashboardStats();
  const { data: recentBookings, isLoading } = useBookings();

  const completed = (recentBookings || []).filter(b => b.status === "confirmed" || b.status === "completed");
  const cancelled = (recentBookings || []).filter(b => b.status === "cancelled");
  const cancelledTotal = cancelled.reduce((s, b) => s + Number(b.price), 0);
  const avgTicket = completed.length > 0 ? Math.round(completed.reduce((s, b) => s + Number(b.price), 0) / completed.length) : 0;

  const financeStats = [
    { label: "Receita do Mês", value: stats ? `R$ ${stats.monthRevenue.toLocaleString("pt-BR")}` : "—", change: stats ? `${stats.revenueMonthChange >= 0 ? "+" : ""}${stats.revenueMonthChange}%` : "", icon: TrendingUp, positive: true },
    { label: "Ticket Médio", value: `R$ ${avgTicket}`, change: "", icon: ArrowUpRight, positive: true },
    { label: "Cancelamentos", value: `R$ ${cancelledTotal.toLocaleString("pt-BR")}`, change: `${cancelled.length} cancelados`, icon: ArrowDownRight, positive: false },
  ];

  const transactions = (recentBookings || [])
    .filter(b => b.status !== "pending")
    .slice(0, 15)
    .map(b => ({
      id: b.id,
      client: b.client_name || b.clients?.name || "—",
      service: b.services?.name || "—",
      amount: Number(b.price),
      date: format(new Date(b.start_time), "dd/MM"),
      status: b.status,
    }));

  return (
    <DashboardLayout title="Financeiro" subtitle="Receitas e transações">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {financeStats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <stat.icon size={18} className={stat.positive ? "text-success" : "text-destructive"} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            {stat.change && <p className={`text-xs mt-1 ${stat.positive ? "text-success" : "text-destructive"}`}>{stat.change}</p>}
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Transações Recentes</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
        ) : !transactions.length ? (
          <p className="text-center text-muted-foreground text-sm py-12">Nenhuma transação registrada</p>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
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
                <p className={`text-sm font-semibold ${t.status === "cancelled" ? "text-destructive line-through" : "text-foreground"}`}>R$ {t.amount}</p>
                <p className="text-xs text-muted-foreground">{t.date}</p>
              </div>
            </div>
          ))
        )}
      </motion.div>
    </DashboardLayout>
  );
};

export default Finance;
