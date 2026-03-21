import AdminLayout from "@/components/layout/AdminLayout";
import { useAdminStats } from "@/hooks/useAdmin";
import { useIsAdmin } from "@/hooks/useAdmin";
import { motion } from "framer-motion";
import { Users, CalendarDays, Building2, DollarSign, Crown, Loader2, TrendingUp, MessageSquare, Key } from "lucide-react";
import { useAllWhatsAppInstances } from "@/hooks/useAdmin";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const AdminDashboard = () => {
  const { data: stats, isLoading } = useAdminStats();
  const { data: instances } = useAllWhatsAppInstances();
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const { data: authCodes } = useQuery({
    queryKey: ["admin-auth-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_auth_codes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const createCode = useMutation({
    mutationFn: async () => {
      const code = generateCode();
      const { error } = await supabase
        .from("admin_auth_codes")
        .insert({ code });
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      qc.invalidateQueries({ queryKey: ["admin-auth-codes"] });
      toast.success(`Código gerado: ${code}`, { duration: 10000 });
    },
    onError: () => toast.error("Erro ao gerar código"),
  });

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

  // Support sees limited cards
  const allCards = [
    { label: "Profissionais", value: stats?.totalProfessionals || 0, icon: Users, color: "text-blue-500", desc: "Total cadastrados", supportVisible: true },
    { label: "Agendamentos", value: stats?.totalBookings || 0, icon: CalendarDays, color: "text-emerald-500", desc: "Total no sistema", supportVisible: true },
    { label: "Clientes", value: stats?.totalClients || 0, icon: Building2, color: "text-purple-500", desc: "Total registrados", supportVisible: true },
    { label: "Receita Total", value: `R$ ${(stats?.totalRevenue || 0).toFixed(2)}`, icon: DollarSign, color: "text-amber-500", desc: "Pagamentos concluídos", supportVisible: false },
    { label: "Assinantes Ativos", value: stats?.activeSubscriptions || 0, icon: Crown, color: "text-accent", desc: `de ${stats?.totalSubscriptions || 0} total`, supportVisible: true },
    { label: "WhatsApp", value: `${connectedWhatsApp}/${totalWhatsApp}`, icon: MessageSquare, color: "text-green-500", desc: "Conectados", supportVisible: true },
  ];

  const cards = isAdmin ? allCards : allCards.filter(c => c.supportVisible);

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

        {/* Quick stats row - admin only */}
        {isAdmin && (
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
        )}

        {/* Auth Codes Section - admin only */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Key size={16} className="text-accent" />
                Códigos de Autorização
              </h3>
              <button
                onClick={() => createCode.mutate()}
                disabled={createCode.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {createCode.isPending ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                Gerar Código
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Códigos usados pelo suporte para alterar plano/validade de assinaturas.
            </p>
            {authCodes && authCodes.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-muted-foreground font-medium">Código</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Criado em</th>
                      <th className="text-left p-3 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {authCodes.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/50">
                        <td className="p-3 font-mono font-bold text-foreground tracking-wider">{c.code}</td>
                        <td className="p-3 text-muted-foreground">
                          {format(new Date(c.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            c.is_used ? "bg-muted text-muted-foreground" : "bg-emerald-500/10 text-emerald-500"
                          }`}>
                            {c.is_used ? "Usado" : "Disponível"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum código gerado ainda</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
