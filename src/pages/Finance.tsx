import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2,
  Plus, Trash2, DollarSign, Users, CheckCircle2, Clock, Filter,
} from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { useCommissions, usePayCommission } from "@/hooks/useCommissions";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { useProfessional } from "@/hooks/useProfessional";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const Finance = () => {
  const { data: professional } = useProfessional();
  const { data: stats } = useDashboardStats();
  const { data: recentBookings, isLoading } = useBookings();
  const { data: expenses } = useExpenses();
  const { data: employees } = useSalonEmployees();
  const { data: commissions } = useCommissions();
  const payCommission = usePayCommission();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const isSalon = professional?.account_type === "salon";
  const [tab, setTab] = useState<"overview" | "expenses" | "commissions">("overview");
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("Geral");

  const completed = (recentBookings || []).filter(b => b.status === "confirmed" || b.status === "completed");
  const cancelled = (recentBookings || []).filter(b => b.status === "cancelled");
  const cancelledTotal = cancelled.reduce((s, b) => s + Number(b.price), 0);
  const avgTicket = completed.length > 0 ? Math.round(completed.reduce((s, b) => s + Number(b.price), 0) / completed.length) : 0;
  const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

  const financeStats = [
    { label: "Receita do Mês", value: stats ? `R$ ${stats.monthRevenue.toLocaleString("pt-BR")}` : "—", change: stats ? `${stats.revenueMonthChange >= 0 ? "+" : ""}${stats.revenueMonthChange}%` : "", icon: TrendingUp, positive: true },
    { label: "Despesas", value: `R$ ${totalExpenses.toLocaleString("pt-BR")}`, change: "", icon: ArrowDownRight, positive: false },
    { label: "Lucro Líquido", value: stats ? `R$ ${(stats.monthRevenue - totalExpenses).toLocaleString("pt-BR")}` : "—", change: "", icon: DollarSign, positive: (stats?.monthRevenue || 0) > totalExpenses },
    { label: "Ticket Médio", value: `R$ ${avgTicket}`, change: `${completed.length} atendimentos`, icon: ArrowUpRight, positive: true },
  ];

  // Employee revenue breakdown
  const employeeRevenue = isSalon && employees
    ? employees.map(emp => {
        const empBookings = completed.filter(b => (b as any).employee_id === emp.id);
        const revenue = empBookings.reduce((s, b) => s + Number(b.price), 0);
        const pendingCommissions = (commissions || []).filter(c => c.employee_id === emp.id && c.status === "pending");
        const pendingTotal = pendingCommissions.reduce((s, c) => s + Number(c.commission_amount), 0);
        return { ...emp, revenue, bookingCount: empBookings.length, pendingCommissions: pendingTotal, pendingIds: pendingCommissions.map(c => c.id) };
      }).sort((a, b) => b.revenue - a.revenue)
    : [];

  const handleAddExpense = () => {
    if (!expenseDesc.trim() || !expenseAmount) return;
    createExpense.mutate({
      description: expenseDesc.trim(),
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      expense_date: new Date().toISOString().split("T")[0],
      employee_id: null,
    });
    setExpenseDesc("");
    setExpenseAmount("");
    setShowExpenseForm(false);
  };

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

  const tabs = [
    { id: "overview" as const, label: "Visão Geral" },
    { id: "expenses" as const, label: "Despesas" },
    ...(isSalon ? [{ id: "commissions" as const, label: "Comissões" }] : []),
  ];

  return (
    <DashboardLayout title="Financeiro" subtitle="Receitas, despesas e comissões">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all",
              tab === t.id ? "gradient-accent text-accent-foreground" : "glass-card text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {financeStats.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <stat.icon size={16} className={stat.positive ? "text-success" : "text-destructive"} />
                </div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                {stat.change && <p className={`text-xs mt-1 ${stat.positive ? "text-success" : "text-destructive"}`}>{stat.change}</p>}
              </motion.div>
            ))}
          </div>

          {/* Employee Revenue Breakdown (salon only) */}
          {isSalon && employeeRevenue.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-2">
                <Users size={16} className="text-accent" />
                <h3 className="font-semibold text-foreground text-sm">Receita por Profissional</h3>
              </div>
              {employeeRevenue.map(emp => (
                <div key={emp.id} className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">
                      {emp.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.bookingCount} atendimentos</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">R$ {emp.revenue.toLocaleString("pt-BR")}</p>
                </div>
              ))}
            </motion.div>
          )}

          {/* Recent transactions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h3 className="font-semibold text-foreground text-sm">Transações Recentes</h3>
            </div>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
            ) : !transactions.length ? (
              <p className="text-center text-muted-foreground text-sm py-12">Nenhuma transação registrada</p>
            ) : (
              transactions.map(t => (
                <div key={t.id} className="flex items-center justify-between px-6 py-3.5 border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                      <CreditCard size={14} className="text-accent" />
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
        </>
      )}

      {tab === "expenses" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-foreground">Despesas</h3>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-accent text-accent-foreground text-sm font-medium hover-lift"
            >
              <Plus size={16} />
              Nova Despesa
            </button>
          </div>

          {showExpenseForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  placeholder="Descrição"
                  maxLength={200}
                  className="px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={e => setExpenseAmount(e.target.value)}
                  placeholder="Valor (R$)"
                  min="0"
                  step="0.01"
                  className="px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <select
                  value={expenseCategory}
                  onChange={e => setExpenseCategory(e.target.value)}
                  className="px-4 py-2.5 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {["Geral", "Aluguel", "Produtos", "Equipamentos", "Marketing", "Salários", "Impostos", "Outros"].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAddExpense}
                disabled={!expenseDesc.trim() || !expenseAmount}
                className="px-6 py-2 rounded-xl gradient-accent text-accent-foreground text-sm font-medium disabled:opacity-50"
              >
                Salvar
              </button>
            </motion.div>
          )}

          <div className="glass-card rounded-2xl overflow-hidden">
            {!(expenses || []).length ? (
              <p className="text-center text-muted-foreground text-sm py-12">Nenhuma despesa registrada</p>
            ) : (
              (expenses || []).map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category} • {format(new Date(exp.expense_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-destructive">- R$ {Number(exp.amount).toLocaleString("pt-BR")}</p>
                    <button onClick={() => deleteExpense.mutate(exp.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === "commissions" && isSalon && (
        <>
          <h3 className="font-semibold text-foreground mb-6">Comissões por Profissional</h3>
          {(employees || []).map(emp => {
            const empCommissions = (commissions || []).filter(c => c.employee_id === emp.id);
            const pending = empCommissions.filter(c => c.status === "pending");
            const paid = empCommissions.filter(c => c.status === "paid");
            const pendingTotal = pending.reduce((s, c) => s + Number(c.commission_amount), 0);
            const paidTotal = paid.reduce((s, c) => s + Number(c.commission_amount), 0);

            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                      {emp.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.commission_percentage}% de comissão</p>
                    </div>
                  </div>
                  {pending.length > 0 && (
                    <button
                      onClick={() => payCommission.mutate(pending.map(c => c.id))}
                      disabled={payCommission.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-medium hover-lift disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      Pagar R$ {pendingTotal.toLocaleString("pt-BR")}
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={12} className="text-warning" />
                      <p className="text-xs text-muted-foreground">Pendente</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">R$ {pendingTotal.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{pending.length} comissões</p>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 size={12} className="text-success" />
                      <p className="text-xs text-muted-foreground">Pago</p>
                    </div>
                    <p className="text-lg font-bold text-foreground">R$ {paidTotal.toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">{paid.length} comissões</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
          {!(employees || []).length && (
            <p className="text-center text-muted-foreground text-sm py-12">Nenhum profissional cadastrado na equipe</p>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default Finance;
