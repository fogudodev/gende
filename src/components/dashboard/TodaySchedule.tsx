import { motion } from "framer-motion";
import { Clock } from "lucide-react";

const fakeSchedule = [
  { id: "1", time: "09:00", client: "Mariana Silva", service: "Corte + Escova", status: "confirmed" },
  { id: "2", time: "10:30", client: "Juliana Costa", service: "Coloração", status: "confirmed" },
  { id: "3", time: "12:00", client: "Fernanda Lima", service: "Manicure + Pedicure", status: "pending" },
  { id: "4", time: "14:00", client: "Beatriz Santos", service: "Hidratação Profunda", status: "confirmed" },
  { id: "5", time: "15:30", client: "Carolina Dias", service: "Design de Sobrancelha", status: "pending" },
  { id: "6", time: "16:30", client: "Rafaela Gomes", service: "Corte Masculino", status: "confirmed" },
  { id: "7", time: "17:30", client: "Patrícia Oliveira", service: "Progressiva", status: "pending" },
  { id: "8", time: "19:00", client: "Amanda Rocha", service: "Escova Modelada", status: "confirmed" },
];

const statusStyles: Record<string, string> = {
  confirmed: "bg-success/15 text-success border border-success/20",
  pending: "bg-warning/15 text-warning border border-warning/20",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
};

const TodaySchedule = () => {
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
          <p className="text-xs md:text-sm text-muted-foreground">{fakeSchedule.length} agendamentos</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock size={16} className="text-primary" />
        </div>
      </div>
      <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
        {fakeSchedule.map((apt, i) => (
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
            <span className={`text-[10px] md:text-xs font-medium px-2 py-0.5 md:px-2.5 md:py-1 rounded-full ${statusStyles[apt.status]}`}>
              <span className="hidden sm:inline">{statusLabels[apt.status]}</span>
              <span className="sm:hidden">{apt.status === "confirmed" ? "✓" : "•"}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default TodaySchedule;
