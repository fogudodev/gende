import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { MessageCircle, Zap, Clock, CheckCircle2, XCircle, ToggleLeft, ToggleRight, Send } from "lucide-react";

const automations = [
  {
    name: "Confirmação de Agendamento",
    description: "Enviada automaticamente após um novo agendamento",
    trigger: "Novo booking",
    status: true,
    sent: 342,
    delivered: 338,
  },
  {
    name: "Lembrete 24h",
    description: "Lembrete enviado 24 horas antes do horário",
    trigger: "24h antes",
    status: true,
    sent: 289,
    delivered: 285,
  },
  {
    name: "Lembrete 3h",
    description: "Lembrete enviado 3 horas antes do horário",
    trigger: "3h antes",
    status: true,
    sent: 275,
    delivered: 271,
  },
  {
    name: "Pós Atendimento",
    description: "Agradecimento e solicitação de avaliação",
    trigger: "Após conclusão",
    status: false,
    sent: 156,
    delivered: 150,
  },
  {
    name: "Reativação de Cliente",
    description: "Enviada para clientes inativos há 30 dias",
    trigger: "30 dias inativo",
    status: false,
    sent: 45,
    delivered: 40,
  },
];

const Automations = () => {
  return (
    <DashboardLayout title="Automações WhatsApp" subtitle="Configure mensagens automáticas">
      {/* Connection Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-6 mb-8 flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
            <MessageCircle size={22} className="text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">WhatsApp Conectado</h3>
            <p className="text-sm text-muted-foreground">+55 11 99999-0000 • Ativo</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium text-success">Online</span>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: "Mensagens Enviadas", value: "1.107", icon: Send },
          { label: "Taxa de Entrega", value: "97.2%", icon: CheckCircle2 },
          { label: "Respostas Recebidas", value: "423", icon: MessageCircle },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass-card rounded-2xl p-5 flex items-center gap-4"
          >
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
      <div className="space-y-4">
        {automations.map((auto, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.06 }}
            className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl gradient-accent/10 bg-accent/10 flex items-center justify-center">
                <Zap size={18} className="text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{auto.name}</h3>
                <p className="text-sm text-muted-foreground">{auto.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {auto.trigger}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {auto.sent} enviadas • {auto.delivered} entregues
                </p>
              </div>
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                {auto.status ? (
                  <ToggleRight size={28} className="text-success" />
                ) : (
                  <ToggleLeft size={28} />
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Automations;
