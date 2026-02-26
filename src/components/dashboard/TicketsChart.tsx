import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useBookings } from "@/hooks/useBookings";

const TicketsChart = () => {
  const { data: bookings } = useBookings();

  const completed = (bookings || []).filter((b) => b.status === "completed").length;
  const active = (bookings || []).filter((b) => b.status === "confirmed" || b.status === "pending").length;

  const ticketData = [
    { name: "Concluídos", value: completed || 1, color: "hsl(210, 80%, 55%)" },
    { name: "Ativos", value: active || 1, color: "hsl(38, 70%, 55%)" },
  ];

  const taskData = [
    { name: "Pendentes", value: (bookings || []).filter((b) => b.status === "pending").length },
    { name: "Confirmados", value: (bookings || []).filter((b) => b.status === "confirmed").length },
    { name: "Concluídos", value: completed },
    { name: "Cancelados", value: (bookings || []).filter((b) => b.status === "cancelled").length },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Pie chart */}
      <div className="bg-card rounded-2xl p-4 md:p-6 lg:p-8 border border-border">
        <h3 className="text-lg md:text-xl font-bold text-foreground mb-4">
          Visão de Agendamentos
        </h3>

        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={ticketData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {ticketData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {ticketData.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs md:text-sm text-foreground">{item.name}</span>
              </div>
              <span className="text-xs md:text-sm font-semibold text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="bg-card rounded-2xl p-4 md:p-6 lg:p-8 border border-border">
        <h3 className="text-lg md:text-xl font-bold text-foreground mb-4">
          Resumo por Status
        </h3>
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {taskData.map((task, idx) => (
            <div
              key={idx}
              className="bg-secondary/50 rounded-lg p-3 md:p-4 border border-border/50 hover:border-accent/30 transition-colors"
            >
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">{task.name}</p>
              <p className="text-xl md:text-2xl font-bold text-foreground">{task.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TicketsChart;
