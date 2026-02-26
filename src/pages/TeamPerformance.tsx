import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { useCommissions } from "@/hooks/useCommissions";
import { useReviews } from "@/hooks/useReviews";
import { useProfessional } from "@/hooks/useProfessional";
import { useBookings } from "@/hooks/useBookings";
import {
  Users, DollarSign, Star, TrendingUp, Award, BarChart3, Loader2,
} from "lucide-react";
import { format, subDays, parseISO, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const TeamPerformance = () => {
  const { data: professional } = useProfessional();
  const { data: employees, isLoading: loadingEmp } = useSalonEmployees();
  const { data: commissions, isLoading: loadingComm } = useCommissions();
  const { data: reviews } = useReviews();
  const { data: allBookings } = useBookings();

  const [period, setPeriod] = useState<"7" | "30" | "90">("30");

  const cutoff = useMemo(() => subDays(new Date(), Number(period)), [period]);

  const metrics = useMemo(() => {
    if (!employees) return [];

    return employees.map((emp) => {
      // Revenue from bookings
      const empBookings = (allBookings || []).filter(
        (b) => b.employee_id === emp.id && b.status === "completed" && isAfter(parseISO(b.created_at), cutoff)
      );
      const revenue = empBookings.reduce((s, b) => s + Number(b.price), 0);
      const bookingCount = empBookings.length;

      // Commissions
      const empCommissions = (commissions || []).filter(
        (c) => c.employee_id === emp.id && isAfter(parseISO(c.created_at), cutoff)
      );
      const totalCommission = empCommissions.reduce((s, c) => s + c.commission_amount, 0);
      const pendingCommission = empCommissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commission_amount, 0);
      const paidCommission = empCommissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.commission_amount, 0);

      // Reviews
      const empReviews = (reviews || []).filter(
        (r) => r.employee_id === emp.id && isAfter(parseISO(r.created_at), cutoff)
      );
      const avgRating = empReviews.length > 0
        ? empReviews.reduce((s, r) => s + r.rating, 0) / empReviews.length
        : 0;
      const reviewCount = empReviews.length;

      return {
        id: emp.id,
        name: emp.name,
        specialty: emp.specialty,
        avatar: emp.name.slice(0, 2).toUpperCase(),
        isActive: emp.is_active,
        commissionPercentage: emp.commission_percentage,
        revenue,
        bookingCount,
        totalCommission,
        pendingCommission,
        paidCommission,
        avgRating,
        reviewCount,
        ticketMedio: bookingCount > 0 ? revenue / bookingCount : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [employees, allBookings, commissions, reviews, cutoff]);

  const totals = useMemo(() => ({
    revenue: metrics.reduce((s, m) => s + m.revenue, 0),
    commissions: metrics.reduce((s, m) => s + m.totalCommission, 0),
    bookings: metrics.reduce((s, m) => s + m.bookingCount, 0),
    avgRating: metrics.filter((m) => m.reviewCount > 0).length > 0
      ? metrics.reduce((s, m) => s + m.avgRating * m.reviewCount, 0) / metrics.reduce((s, m) => s + m.reviewCount, 0)
      : 0,
  }), [metrics]);

  const isLoading = loadingEmp || loadingComm;

  if (professional?.account_type !== "salon") {
    return (
      <DashboardLayout title="Desempenho da Equipe">
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Users className="text-muted-foreground mb-4" size={48} />
          <h2 className="text-xl font-bold mb-2">Recurso exclusivo para Salões</h2>
          <p className="text-muted-foreground">Disponível apenas para contas do tipo Salão/Barbearia.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Desempenho da Equipe" subtitle="Métricas consolidadas por profissional">
      {/* Period filter */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { value: "7" as const, label: "7 dias" },
          { value: "30" as const, label: "30 dias" },
          { value: "90" as const, label: "90 dias" },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-accent text-accent-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Faturamento Total", value: `R$ ${totals.revenue.toFixed(2)}`, icon: DollarSign },
          { label: "Comissões Geradas", value: `R$ ${totals.commissions.toFixed(2)}`, icon: TrendingUp },
          { label: "Total Atendimentos", value: String(totals.bookings), icon: BarChart3 },
          { label: "Nota Média", value: totals.avgRating > 0 ? `${totals.avgRating.toFixed(1)} ⭐` : "—", icon: Star },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <s.icon size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Employee cards */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : metrics.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">Nenhum funcionário cadastrado</p>
      ) : (
        <div className="space-y-4">
          {metrics.map((emp, i) => (
            <motion.div key={emp.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                    {emp.avatar}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {emp.name}
                      {i === 0 && metrics.length > 1 && <Award size={14} className="text-warning" />}
                    </h3>
                    <p className="text-xs text-muted-foreground">{emp.specialty || "Geral"} • {emp.commissionPercentage}% comissão</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${emp.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {emp.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Faturamento</p>
                  <p className="text-sm font-bold text-foreground">R$ {emp.revenue.toFixed(2)}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Atendimentos</p>
                  <p className="text-sm font-bold text-foreground">{emp.bookingCount}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
                  <p className="text-sm font-bold text-foreground">R$ {emp.ticketMedio.toFixed(2)}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Comissão Total</p>
                  <p className="text-sm font-bold text-foreground">R$ {emp.totalCommission.toFixed(2)}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pendente</p>
                  <p className="text-sm font-bold text-warning">R$ {emp.pendingCommission.toFixed(2)}</p>
                </div>
                <div className="bg-muted/20 rounded-xl p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avaliação</p>
                  <p className="text-sm font-bold text-foreground">
                    {emp.avgRating > 0 ? `${emp.avgRating.toFixed(1)} ⭐ (${emp.reviewCount})` : "—"}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeamPerformance;
