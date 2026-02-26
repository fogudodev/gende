import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useBookings } from "@/hooks/useBookings";
import { useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "@/hooks/useProfessional";

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const RevenueChart = () => {
  const { data: professional } = useProfessional();
  const today = new Date();

  const { data: weekBookings } = useQuery({
    queryKey: ["revenue-chart", professional?.id],
    queryFn: async () => {
      const start = startOfDay(subDays(today, 6)).toISOString();
      const end = endOfDay(today).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("start_time, price, status")
        .eq("professional_id", professional!.id)
        .gte("start_time", start)
        .lte("start_time", end)
        .in("status", ["confirmed", "completed"]);
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });

  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return { date: format(d, "yyyy-MM-dd"), name: dayLabels[d.getDay()], receita: 0 };
    });
    (weekBookings || []).forEach(b => {
      const key = format(new Date(b.start_time), "yyyy-MM-dd");
      const day = days.find(d => d.date === key);
      if (day) day.receita += Number(b.price);
    });
    return days;
  }, [weekBookings]);

  const weekTotal = chartData.reduce((s, d) => s + d.receita, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Receita da Semana</h3>
          <p className="text-sm text-muted-foreground">Últimos 7 dias</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">R$ {weekTotal.toLocaleString("pt-BR")}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38 70% 55%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(38 70% 55%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 15% 90%)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(25 10% 50%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "hsl(25 10% 50%)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "hsl(0 0% 100% / 0.9)", backdropFilter: "blur(12px)", border: "1px solid hsl(0 0% 100% / 0.2)", borderRadius: "12px", boxShadow: "0 8px 32px -8px hsl(25 30% 12% / 0.15)" }}
            formatter={(value: number) => [`R$ ${value}`, "Receita"]}
          />
          <Area type="monotone" dataKey="receita" stroke="hsl(38 70% 55%)" strokeWidth={2.5} fill="url(#revenueGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RevenueChart;
