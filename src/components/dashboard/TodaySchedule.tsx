import { motion } from "framer-motion";
import { Clock, Loader2 } from "lucide-react";
import { useBookings } from "@/hooks/useBookings";
import { format } from "date-fns";

const statusStyles: Record<string, string> = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  completed: "bg-accent/10 text-accent",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Faltou",
};

const TodaySchedule = () => {
  const { data: bookings, isLoading } = useBookings(new Date());

  const upcoming = (bookings || []).filter(b => b.status !== "cancelled");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Agenda de Hoje</h3>
          <p className="text-sm text-muted-foreground">{upcoming.length} agendamentos</p>
        </div>
        <Clock size={18} className="text-muted-foreground" />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
      ) : !upcoming.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum agendamento hoje</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((apt, i) => (
            <motion.div
              key={apt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors group"
            >
              <span className="text-sm font-semibold text-accent min-w-[48px]">
                {format(new Date(apt.start_time), "HH:mm")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{apt.client_name || apt.clients?.name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{apt.services?.name || "—"}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[apt.status] || "bg-muted text-muted-foreground"}`}>
                {statusLabels[apt.status] || apt.status}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TodaySchedule;
