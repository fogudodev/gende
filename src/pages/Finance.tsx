import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2,
  Plus, Trash2, DollarSign, Users, CheckCircle2, Clock, CalendarIcon,
} from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useExpenses, useCreateExpense, useDeleteExpense, Expense } from "@/hooks/useExpenses";
import { useCommissions, usePayCommission } from "@/hooks/useCommissions";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { useProfessional } from "@/hooks/useProfessional";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, startOfQuarter, endOfQuarter, eachMonthOfInterval, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

type PeriodFilter = "week" | "month" | "quarter" | "custom";

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
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  // Period filter state
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month");
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);

  const now = new Date();
  const periodRange = useMemo(() => {
    switch (periodFilter) {
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case "month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "quarter":
        return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case "custom":
        return { start: customStart || startOfMonth(now), end: customEnd || endOfMonth(now) };
    }
  }, [periodFilter, customStart, customEnd]);

  const periodLabel = useMemo(() => {
    const labels: Record<PeriodFilter, string> = {
      week: "Esta Semana",
      month: "Este Mês",
      quarter: "Este Trimestre",
      custom: customStart && customEnd
        ? `${format(customStart, "dd/MM")} - ${format(customEnd, "dd/MM")}`
        : "Personalizado",
    };
    return labels[periodFilter];
  }, [periodFilter, customStart, customEnd]);

  // Filter bookings by period
  const filteredBookings = useMemo(() => {
    return (recentBookings || []).filter(b => {
      const d = new Date(b.start_time);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [recentBookings, periodRange]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      const d = new Date(e.expense_date);
      return d >= periodRange.start && d <= periodRange.end;
    });
  }, [expenses, periodRange]);

  const completed = filteredBookings.filter(b => b.status === "confirmed" || b.status === "completed");
  const cancelled = filteredBookings.filter(b => b.status === "cancelled");
  const totalRevenue = completed.reduce((s, b) => s + Number(b.price), 0);
  const avgTicket = completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0;
  const totalExpenses = filteredExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const financeStats = [
    { label: `Receita (${periodLabel})`, value: `R$ ${totalRevenue.toLocaleString("pt-BR")}`, change: stats ? `${stats.revenueMonthChange >= 0 ? "+" : ""}${stats.revenueMonthChange}%` : "", icon: TrendingUp, positive: true },
    { label: "Despesas", value: `R$ ${totalExpenses.toLocaleString("pt-BR")}`, change: "", icon: ArrowDownRight, positive: false },
    { label: "Lucro Líquido", value: `R$ ${(totalRevenue - totalExpenses).toLocaleString("pt-BR")}`, change: "", icon: DollarSign, positive: totalRevenue > totalExpenses },
    { label: "Ticket Médio", value: `R$ ${avgTicket}`, change: `${completed.length} atendimentos`, icon: ArrowUpRight, positive: true },
  ];

  // Chart data - last 6 months
  const chartData = useMemo(() => {
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map(month => {
      const monthRevenue = (recentBookings || [])
        .filter(b => (b.status === "confirmed" || b.status === "completed") && isSameMonth(new Date(b.start_time), month))
        .reduce((s, b) => s + Number(b.price), 0);
      const monthExpenses = (expenses || [])
        .filter(e => isSameMonth(new Date(e.expense_date), month))
        .reduce((s, e) => s + Number(e.amount), 0);
      return {
        month: format(month, "MMM", { locale: ptBR }),
        receita: monthRevenue,
        despesas: monthExpenses,
      };
    });
  }, [recentBookings, expenses]);

  const chartConfig = {
    receita: { label: "Receita", color: "hsl(var(--accent))" },
    despesas: { label: "Despesas", color: "hsl(var(--destructive))" },
  };

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

  const handleDeleteExpense = () => {
    if (!deleteTarget) return;
    deleteExpense.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const transactions = filteredBookings
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

  const tabsList = [
    { id: "overview" as const, label: "Visão Geral" },
    { id: "expenses" as const, label: "Despesas" },
    ...(isSalon ? [{ id: "commissions" as const, label: "Comissões" }] : []),
  ];

  const periodOptions: { id: PeriodFilter; label: string }[] = [
    { id: "week", label: "Semana" },
    { id: "month", label: "Mês" },
    { id: "quarter", label: "Trimestre" },
    { id: "custom", label: "Personalizado" },
  ];

  return (
    <DashboardLayout title="Financeiro" subtitle="Receitas, despesas e comissões">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tabsList.map(t => (
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

      {/* Period Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periodOptions.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriodFilter(p.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              periodFilter === p.id
                ? "bg-accent/15 border-accent/40 text-accent"
                : "bg-muted/30 border-border/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
        {periodFilter === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                  <CalendarIcon size={12} />
                  {customStart ? format(customStart, "dd/MM/yy") : "Início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customStart} onSelect={setCustomStart} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <span className="text-xs text-muted-foreground">até</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
                  <CalendarIcon size={12} />
                  {customEnd ? format(customEnd, "dd/MM/yy") : "Fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customEnd} onSelect={setCustomEnd} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        )}
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

          {/* Revenue vs Expense Chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-5 mb-6">
            <h3 className="font-semibold text-foreground text-sm mb-4">Receita vs Despesas (últimos 6 meses)</h3>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${v}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="receita" fill="var(--color-receita)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="var(--color-despesas)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </motion.div>

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
            {!filteredExpenses.length ? (
              <p className="text-center text-muted-foreground text-sm py-12">Nenhuma despesa registrada neste período</p>
            ) : (
              filteredExpenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between px-6 py-4 border-b border-border/30 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{exp.description}</p>
                    <p className="text-xs text-muted-foreground">{exp.category} • {format(new Date(exp.expense_date), "dd/MM/yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-destructive">- R$ {Number(exp.amount).toLocaleString("pt-BR")}</p>
                    <button onClick={() => setDeleteTarget(exp)} className="text-muted-foreground hover:text-destructive transition-colors">
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

      {/* Delete Expense Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a despesa "{deleteTarget?.description}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Finance;
