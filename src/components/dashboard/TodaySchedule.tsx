import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const appointments = [
  { time: "09:00", client: "Ana Silva", service: "Corte + Escova", status: "confirmed" },
  { time: "10:30", client: "Maria Santos", service: "Coloração", status: "confirmed" },
  { time: "13:00", client: "Julia Oliveira", service: "Manicure + Pedicure", status: "pending" },
  { time: "14:30", client: "Carla Lima", service: "Hidratação", status: "confirmed" },
  { time: "16:00", client: "Beatriz Costa", service: "Corte Masculino", status: "pending" },
];

const statusStyles = {
  confirmed: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
};

const statusLabels = {
  confirmed: "Confirmado",
  pending: "Pendente",
};

const TodaySchedule = () => {
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
          <p className="text-sm text-muted-foreground">{appointments.length} agendamentos</p>
        </div>
        <Clock size={18} className="text-muted-foreground" />
      </div>
      <div className="space-y-3">
        {appointments.map((apt, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors group"
          >
            <span className="text-sm font-semibold text-accent min-w-[48px]">{apt.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{apt.client}</p>
              <p className="text-xs text-muted-foreground truncate">{apt.service}</p>
            </div>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                statusStyles[apt.status as keyof typeof statusStyles]
              }`}
            >
              {statusLabels[apt.status as keyof typeof statusLabels]}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default TodaySchedule;
