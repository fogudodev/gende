import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { MessageCircle, Zap, Clock, CheckCircle2, Send, ToggleLeft, ToggleRight, Loader2 } from "lucide-react";
import { useWhatsAppInstance, useWhatsAppAutomations, useToggleAutomation, useWhatsAppLogs } from "@/hooks/useWhatsApp";
import { toast } from "sonner";

const triggerLabels: Record<string, string> = {
  booking_created: "Novo booking",
  reminder_24h: "24h antes",
  reminder_3h: "3h antes",
  post_service: "Após conclusão",
  post_sale_review: "24h após conclusão",
  maintenance_reminder: "Manutenção próxima",
  reactivation_30d: "30 dias inativo",
};

const triggerDescriptions: Record<string, string> = {
  booking_created: "Enviada automaticamente após um novo agendamento",
  reminder_24h: "Lembrete enviado 24 horas antes do horário",
  reminder_3h: "Lembrete enviado 3 horas antes do horário",
  post_service: "Agradecimento após conclusão do serviço",
  post_sale_review: "Pedido de avaliação 24h após o serviço — avaliação vai para o profissional/funcionário que atendeu",
  maintenance_reminder: "Lembrete quando a manutenção do serviço está próxima",
  reactivation_30d: "Enviada para clientes inativos há 30 dias",
};

const Automations = () => {
  const { data: instance, isLoading: loadingInstance } = useWhatsAppInstance();
  const { data: automations, isLoading: loadingAuto } = useWhatsAppAutomations();
  const { data: logs } = useWhatsAppLogs();
  const toggleAutomation = useToggleAutomation();

  const isLoading = loadingInstance || loadingAuto;

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      await toggleAutomation.mutateAsync({ id, is_active: !currentState });
      toast.success(!currentState ? "Automação ativada" : "Automação desativada");
    } catch { toast.error("Erro ao alterar automação"); }
  };

  const totalSent = (logs || []).filter(l => l.status === "sent" || l.status === "delivered").length;
  const totalDelivered = (logs || []).filter(l => l.status === "delivered").length;
  const deliveryRate = totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : "0";

  return (
    <DashboardLayout title="Automações WhatsApp" subtitle="Configure mensagens automáticas">
      {/* Connection Status */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${instance?.status === "connected" ? "bg-success/10" : "bg-warning/10"} flex items-center justify-center`}>
            <MessageCircle size={22} className={instance?.status === "connected" ? "text-success" : "text-warning"} />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {instance?.status === "connected" ? "WhatsApp Conectado" : instance ? "WhatsApp Desconectado" : "WhatsApp não configurado"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {instance?.phone_number ? `${instance.phone_number} • ${instance.status}` : "Configure nas configurações"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${instance?.status === "connected" ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          <span className={`text-sm font-medium ${instance?.status === "connected" ? "text-success" : "text-muted-foreground"}`}>
            {instance?.status === "connected" ? "Online" : "Offline"}
          </span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Mensagens Enviadas", value: String(totalSent), icon: Send },
          { label: "Taxa de Entrega", value: `${deliveryRate}%`, icon: CheckCircle2 },
          { label: "Total de Logs", value: String((logs || []).length), icon: MessageCircle },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} className="glass-card rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <stat.icon size={18} className="text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Automations List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : !automations?.length ? (
        <p className="text-center text-muted-foreground py-12">Nenhuma automação configurada</p>
      ) : (
        <div className="space-y-4">
          {automations.map((auto, i) => (
            <motion.div key={auto.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Zap size={18} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{triggerDescriptions[auto.trigger_type]?.split(" ")[0] || auto.trigger_type}</h3>
                  <p className="text-sm text-muted-foreground">{triggerDescriptions[auto.trigger_type] || ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock size={12} />
                    {triggerLabels[auto.trigger_type] || auto.trigger_type}
                  </div>
                </div>
                <button onClick={() => handleToggle(auto.id, auto.is_active)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {auto.is_active ? <ToggleRight size={28} className="text-success" /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Automations;
