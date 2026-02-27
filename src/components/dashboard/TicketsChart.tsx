import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { useBookings } from "@/hooks/useBookings";
import { useMemo } from "react";

const TicketsChart = () => {
  const { data: bookings } = useBookings();

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      confirmed: 0,
      pending: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };
    (bookings || []).forEach((b) => {
      const s = b.status as string;
      if (map[s] !== undefined) map[s]++;
    });
    return map;
  }, [bookings]);

  const pieData = [
    { name: "Concluídos", value: counts.completed, color: "hsl(336, 100%, 50%)" },
    { name: "Confirmados", value: counts.confirmed, color: "hsl(210, 80%, 55%)" },
    { name: "Pendentes", value: counts.pending, color: "hsl(38, 92%, 50%)" },
  ].filter((d) => d.value > 0);

  const statusGrid = [
    { name: "Confirmados", value: counts.confirmed },
    { name: "Pendentes", value: counts.pending },
    { name: "Concluídos", value: counts.completed },
    { name: "Cancelados", value: counts.cancelled },
    { name: "No-Show", value: counts.no_show },
  ];

  const hasData = pieData.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6"
    >
      {/* Pie chart */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-foreground font-display mb-4">
          Visão Geral
        </h3>

        {hasData ? (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Sem dados</p>
          </div>
        )}

        <div className="mt-4 space-y-2.5">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs md:text-sm text-muted-foreground">{item.name}</span>
              </div>
              <span className="text-xs md:text-sm font-bold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="glass-card rounded-2xl p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-foreground font-display mb-4">
          Resumo por Status
        </h3>
        <div className="grid grid-cols-2 gap-2.5 md:gap-3">
          {statusGrid.map((task, idx) => (
            <div
              key={idx}
              className="bg-secondary/40 rounded-xl p-3 md:p-4 border border-border/50 hover:border-primary/20 transition-colors cursor-pointer group"
            >
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{task.name}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground font-display group-hover:text-primary transition-colors">
                {task.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default TicketsChart;
