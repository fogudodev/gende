import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { startOfDay, endOfDay, format } from "date-fns";

const statusStyles: Record<string, string> = {
  confirmed: "bg-success/15 text-success border border-success/20",
  pending: "bg-warning/15 text-warning border border-warning/20",
  completed: "bg-primary/15 text-primary border border-primary/20",
  cancelled: "bg-destructive/15 text-destructive border border-destructive/20",
  no_show: "bg-muted text-muted-foreground border border-border",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "No-show",
};

const TodaySchedule = () => {
  const { data: professional } = useProfessional();

  const { data: todayBookings } = useQuery({
    queryKey: ["today-schedule", professional?.id],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("bookings")
        .select("id, start_time, client_name, status, services(name)")
        .eq("professional_id", professional!.id)
        .gte("start_time", startOfDay(now).toISOString())
        .lte("start_time", endOfDay(now).toISOString())
        .order("start_time", { ascending: true });
      return data || [];
    },
    enabled: !!professional?.id,
    refetchInterval: 60000,
  });

  const schedule = (todayBookings || []).map((b: any) => ({
    id: b.id,
    time: format(new Date(b.start_time), "HH:mm"),
    client: b.client_name || "—",
    service: b.services?.name || "—",
    status: b.status as string,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-4 md:p-6 h-full"
    >
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h3 className="text-base md:text-lg font-semibold text-foreground font-display">Agenda de Hoje</h3>
          <p className="text-xs md:text-sm text-muted-foreground">{schedule.length} agendamento{schedule.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock size={16} className="text-primary" />
        </div>
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
        {schedule.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhum agendamento hoje</p>
        ) : (
          schedule.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.06 }}
              className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-secondary/50 transition-colors group cursor-pointer"
            >
              <span className="text-xs md:text-sm font-bold text-primary min-w-[40px] md:min-w-[48px] font-display">
                {apt.time}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-sm font-medium text-foreground truncate">{apt.client}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{apt.service}</p>
              </div>
              <span className={`text-[10px] md:text-xs font-medium px-2 py-0.5 md:px-2.5 md:py-1 rounded-full ${statusStyles[apt.status] || statusStyles.pending}`}>
                <span className="hidden sm:inline">{statusLabels[apt.status] || apt.status}</span>
                <span className="sm:hidden">{apt.status === "confirmed" || apt.status === "completed" ? "✓" : "•"}</span>
              </span>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};

export default TodaySchedule;
