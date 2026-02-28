import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, subDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const RevenueChart = () => {
  const { data: professional } = useProfessional();

  const { data: bookings } = useQuery({
    queryKey: ["revenue-chart", professional?.id],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), 6)).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("price, start_time, status")
        .eq("professional_id", professional!.id)
        .gte("start_time", start)
        .in("status", ["confirmed", "completed"]);
      return data || [];
    },
    enabled: !!professional?.id,
  });

  const { data: expenses } = useQuery({
    queryKey: ["revenue-chart-expenses", professional?.id],
    queryFn: async () => {
      const start = subDays(new Date(), 6).toISOString().split("T")[0];
      const { data } = await supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("professional_id", professional!.id)
        .gte("expense_date", start);
      return data || [];
    },
    enabled: !!professional?.id,
  });

  const chartData = useMemo(() => {
    const days: { name: string; receita: number; despesa: number; lucro: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dayStr = format(date, "yyyy-MM-dd");
      const label = format(date, "EEE", { locale: ptBR });
      const revenue = (bookings || [])
        .filter((b) => b.start_time.startsWith(dayStr))
        .reduce((sum, b) => sum + Number(b.price), 0);
      const expense = (expenses || [])
        .filter((e) => e.expense_date === dayStr)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      days.push({
        name: label.charAt(0).toUpperCase() + label.slice(1),
        receita: revenue,
        despesa: expense,
        lucro: revenue - expense,
      });
    }
    return days;
  }, [bookings, expenses]);

  const weekTotal = chartData.reduce((s, d) => s + d.receita, 0);
  const weekExpenses = chartData.reduce((s, d) => s + d.despesa, 0);
  const weekProfit = weekTotal - weekExpenses;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="glass-card rounded-2xl p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground font-display">Receita da Semana</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="text-lg md:text-2xl font-bold text-foreground font-display">
            {weekProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
          {weekExpenses > 0 && (
            <p className="text-xs text-muted-foreground">
              Bruto: {weekTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · Custos: -{weekExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(336, 100%, 50%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(336, 100%, 50%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "hsl(0, 0%, 55%)" }} axisLine={false} tickLine={false} hide />
          <Tooltip
            contentStyle={{
              background: "hsla(0, 0%, 7%, 0.95)",
              backdropFilter: "blur(12px)",
              border: "1px solid hsla(0, 0%, 100%, 0.1)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px -8px hsla(0, 0%, 0%, 0.5)",
              color: "hsl(0, 0%, 95%)",
            }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = { receita: "Receita Bruta", despesa: "Custos", lucro: "Lucro Líquido" };
              return [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, labels[name] || name];
            }}
          />
          <Area type="monotone" dataKey="receita" stroke="hsl(336, 100%, 50%)" strokeWidth={1.5} fill="url(#revenueGradient)" strokeDasharray="5 5" />
          <Area type="monotone" dataKey="lucro" stroke="hsl(142, 76%, 46%)" strokeWidth={2.5} fill="url(#profitGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RevenueChart;
