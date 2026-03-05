import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useProfessional } from "@/hooks/useProfessional";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format, isAfter } from "date-fns";
import {
  CalendarPlus,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Wallet,
} from "lucide-react";

const statusDot: Record<string, string> = {
  confirmed: "bg-emerald-400",
  pending: "bg-amber-400",
  completed: "bg-primary",
  cancelled: "bg-destructive",
  no_show: "bg-muted-foreground",
};

const MobileDayOverview = () => {
  const navigate = useNavigate();
  const { data: professional } = useProfessional();
  const { data: stats } = useDashboardStats();

  const { data: todayBookings } = useQuery({
    queryKey: ["mobile-today", professional?.id],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from("bookings")
        .select("id, start_time, end_time, client_name, status, price, services(name)")
        .eq("professional_id", professional!.id)
        .gte("start_time", startOfDay(now).toISOString())
        .lte("start_time", endOfDay(now).toISOString())
        .neq("status", "cancelled")
        .order("start_time", { ascending: true });
      return data || [];
    },
    enabled: !!professional?.id,
    refetchInterval: 60000,
  });

  const now = new Date();
  const bookings = todayBookings || [];
  const nextBooking = bookings.find((b: any) => isAfter(new Date(b.start_time), now) && b.status !== "completed");
  const completedCount = bookings.filter((b: any) => b.status === "completed").length;
  const pendingCount = bookings.filter((b: any) => b.status === "pending").length;
  const todayRevenue = stats?.todayRevenue ?? 0;

  const quickActions = [
    { icon: CalendarPlus, label: "Agendar", path: "/bookings", color: "text-primary" },
    { icon: Users, label: "Clientes", path: "/clients", color: "text-blue-400" },
    { icon: Wallet, label: "Caixa", path: "/cash-register", color: "text-emerald-400" },
    { icon: DollarSign, label: "Financeiro", path: "/finance", color: "text-amber-400" },
  ];

  return (
    <div className="md:hidden space-y-3">
      {/* Greeting + Summary */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-2xl p-4"
      >
        <p className="text-sm text-muted-foreground">
          {format(now, "EEEE, d 'de' MMMM")}
        </p>
        <h2 className="text-lg font-bold text-foreground font-display mt-0.5">
          Olá, {professional?.business_name || professional?.name?.split(" ")[0] || ""}! 👋
        </h2>

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">{bookings.length}</p>
            <p className="text-[10px] text-muted-foreground">Agendamentos</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-emerald-400">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">Concluídos</p>
          </div>
          <div className="bg-secondary/50 rounded-xl p-2.5 text-center">
            <p className="text-lg font-bold text-foreground">
              {todayRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 })}
            </p>
            <p className="text-[10px] text-muted-foreground">Receita</p>
          </div>
        </div>
      </motion.div>

      {/* Next appointment */}
      {nextBooking && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={() => navigate("/bookings")}
          className="glass-card rounded-2xl p-4 w-full text-left flex items-center gap-3 border border-primary/20 bg-primary/5 active:scale-[0.98] transition-transform"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Clock size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Próximo</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {(nextBooking as any).client_name || "Cliente"} — {format(new Date((nextBooking as any).start_time), "HH:mm")}
            </p>
            <p className="text-xs text-muted-foreground truncate">{(nextBooking as any).services?.name || "Serviço"}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </motion.button>
      )}

      {/* Pending alert */}
      {pendingCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          onClick={() => navigate("/bookings")}
          className="glass-card rounded-2xl p-3 w-full text-left flex items-center gap-3 border border-amber-500/20 bg-amber-500/5 active:scale-[0.98] transition-transform"
        >
          <AlertCircle size={18} className="text-amber-400 shrink-0" />
          <p className="text-sm text-foreground flex-1">
            <span className="font-semibold text-amber-400">{pendingCount}</span> agendamento{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""}
          </p>
          <ChevronRight size={16} className="text-muted-foreground shrink-0" />
        </motion.button>
      )}

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-4 gap-2"
      >
        {quickActions.map((action) => (
          <button
            key={action.path}
            onClick={() => navigate(action.path)}
            className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <action.icon size={20} className={action.color} />
            <span className="text-[10px] font-medium text-muted-foreground">{action.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Timeline */}
      {bookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="glass-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Timeline do dia</h3>
            <button onClick={() => navigate("/bookings")} className="text-[10px] text-primary font-medium">
              Ver tudo
            </button>
          </div>
          <div className="space-y-1">
            {bookings.slice(0, 6).map((b: any, i: number) => {
              const isPast = !isAfter(new Date(b.start_time), now);
              const isNext = nextBooking && b.id === (nextBooking as any).id;
              return (
                <div
                  key={b.id}
                  className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg transition-colors ${
                    isNext ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={`w-2 h-2 rounded-full ${statusDot[b.status] || statusDot.pending}`} />
                    {i < Math.min(bookings.length, 6) - 1 && (
                      <div className="w-px h-4 bg-border" />
                    )}
                  </div>
                  <span className={`text-xs font-mono min-w-[36px] ${isPast ? "text-muted-foreground" : "text-foreground font-semibold"}`}>
                    {format(new Date(b.start_time), "HH:mm")}
                  </span>
                  <span className={`text-xs truncate flex-1 ${isPast ? "text-muted-foreground" : "text-foreground"}`}>
                    {b.client_name || "—"}
                  </span>
                  {b.status === "completed" && <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />}
                </div>
              );
            })}
            {bookings.length > 6 && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                +{bookings.length - 6} mais
              </p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MobileDayOverview;
