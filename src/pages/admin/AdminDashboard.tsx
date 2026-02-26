import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminStats } from "@/hooks/useAdmin";
import { motion } from "framer-motion";
import { Users, CalendarDays, Building2, DollarSign, Crown, Loader2, TrendingUp, MessageSquare } from "lucide-react";
import { useAllWhatsAppInstances } from "@/hooks/useAdmin";

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();
  const { data: instances } = useAllWhatsAppInstances();

  if (isLoading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
        </div>
      </AdminLayout>
    );
  }

  const connectedWhatsApp = (instances || []).filter(i => i.status === "connected").length;
  const totalWhatsApp = (instances || []).length;

  const cards = [
    { label: "Profissionais", value: stats?.totalProfessionals || 0, icon: Users, color: "text-blue-500", desc: "Total cadastrados" },
    { label: "Agendamentos", value: stats?.totalBookings || 0, icon: CalendarDays, color: "text-emerald-500", desc: "Total no sistema" },
    { label: "Clientes", value: stats?.totalClients || 0, icon: Building2, color: "text-purple-500", desc: "Total registrados" },
    { label: "Receita Total", value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "text-amber-500", desc: "Pagamentos concluídos" },
    { label: "Assinantes Ativos", value: stats?.activeSubscriptions || 0, icon: Crown, color: "text-accent", desc: `de ${stats?.totalSubscriptions || 0} total` },
    { label: "WhatsApp", value: `${connectedWhatsApp}/${totalWhatsApp}`, icon: MessageSquare, color: "text-green-500", desc: "Conectados" },
  ];

  return (
    <AdminLayout title="Dashboard" subtitle="Visão geral do sistema">
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-2xl p-5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
                <c.icon size={16} className={c.color} />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-[11px] text-muted-foreground">{c.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Quick stats row */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp size={16} className="text-accent" />
            Resumo Rápido
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Taxa de conversão</span>
              <p className="text-foreground font-bold text-lg">
                {stats?.totalProfessionals ? ((stats.activeSubscriptions / stats.totalProfessionals) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Ticket médio</span>
              <p className="text-foreground font-bold text-lg">
                R$ {stats?.totalBookings ? (stats.totalRevenue / stats.totalBookings).toFixed(2) : "0.00"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Clientes/profissional</span>
              <p className="text-foreground font-bold text-lg">
                {stats?.totalProfessionals ? (stats.totalClients / stats.totalProfessionals).toFixed(1) : 0}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Agend./profissional</span>
              <p className="text-foreground font-bold text-lg">
                {stats?.totalProfessionals ? (stats.totalBookings / stats.totalProfessionals).toFixed(1) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
