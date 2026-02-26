import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Plus, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useBookings, useUpdateBooking } from "@/hooks/useBookings";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const timeSlots = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const statusColors: Record<string, string> = {
  confirmed: "border-l-success bg-success/5",
  pending: "border-l-warning bg-warning/5",
  completed: "border-l-accent bg-accent/5",
  cancelled: "border-l-destructive bg-destructive/5",
  no_show: "border-l-muted bg-muted/5",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { data: bookings, isLoading } = useBookings(selectedDate);
  const updateBooking = useUpdateBooking();

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateBooking.mutateAsync({ id, status: status as any });
      toast.success(`Status alterado para ${statusLabels[status]}`);
    } catch { toast.error("Erro ao atualizar status"); }
  };

  return (
    <DashboardLayout title="Agendamentos" subtitle="Gerencie sua agenda">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </h2>
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            Hoje
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-6">
          <div className="space-y-1">
            {timeSlots.map((slot) => {
              const slotBookings = (bookings || []).filter(b => format(new Date(b.start_time), "HH:mm") === slot);
              return (
                <div key={slot} className="flex items-stretch min-h-[56px] group">
                  <span className="w-16 text-xs font-medium text-muted-foreground pt-2 shrink-0">{slot}</span>
                  <div className="flex-1 border-t border-border/30 pl-4 pt-1 pb-1">
                    {slotBookings.length > 0 ? (
                      slotBookings.map(booking => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`rounded-xl p-3 border-l-[3px] ${statusColors[booking.status] || "border-l-muted bg-muted/5"} cursor-pointer hover:shadow-md transition-all mb-1`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{booking.client_name || booking.clients?.name || "—"}</p>
                              <p className="text-xs text-muted-foreground">{booking.services?.name || "—"} • {booking.duration_minutes}min</p>
                            </div>
                            <select
                              value={booking.status}
                              onChange={e => handleStatusChange(booking.id, e.target.value)}
                              className="text-xs bg-transparent border border-border/50 rounded-lg px-2 py-1 text-muted-foreground focus:outline-none"
                            >
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-full rounded-xl hover:bg-muted/20 transition-colors cursor-pointer" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!bookings?.length && (
            <p className="text-center text-muted-foreground text-sm mt-4">Nenhum agendamento para este dia</p>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Bookings;
