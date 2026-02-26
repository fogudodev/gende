import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const bookings = [
  { time: "09:00", duration: 1, client: "Ana Silva", service: "Corte Feminino", status: "confirmed" },
  { time: "10:00", duration: 2, client: "Maria Santos", service: "Coloração", status: "confirmed" },
  { time: "13:00", duration: 1, client: "Julia Oliveira", service: "Manicure", status: "pending" },
  { time: "14:00", duration: 1, client: "Carla Lima", service: "Hidratação", status: "confirmed" },
  { time: "16:00", duration: 1, client: "Beatriz Costa", service: "Corte Masculino", status: "pending" },
];

const statusColors = {
  confirmed: "border-l-success bg-success/5",
  pending: "border-l-warning bg-warning/5",
};

const Bookings = () => {
  return (
    <DashboardLayout title="Agendamentos" subtitle="Gerencie sua agenda">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">26 de Fevereiro, 2026</h2>
          <button className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors">
            <Filter size={15} />
            Filtros
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover-lift">
            <Plus size={16} />
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="space-y-1">
          {timeSlots.map((slot) => {
            const booking = bookings.find((b) => b.time === slot);
            return (
              <div key={slot} className="flex items-stretch min-h-[56px] group">
                <span className="w-16 text-xs font-medium text-muted-foreground pt-2 shrink-0">{slot}</span>
                <div className="flex-1 border-t border-border/30 pl-4 pt-1 pb-1">
                  {booking ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`rounded-xl p-3 border-l-[3px] ${
                        statusColors[booking.status as keyof typeof statusColors]
                      } cursor-pointer hover:shadow-md transition-all`}
                    >
                      <p className="text-sm font-semibold text-foreground">{booking.client}</p>
                      <p className="text-xs text-muted-foreground">{booking.service}</p>
                    </motion.div>
                  ) : (
                    <div className="h-full rounded-xl hover:bg-muted/20 transition-colors cursor-pointer" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Bookings;
