import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { MessageCircle, Zap, Clock, CheckCircle2, Send, ToggleLeft, ToggleRight, Loader2, Sparkles, Save, ChevronDown, ChevronUp, Edit3 } from "lucide-react";
import { useWhatsAppInstance, useWhatsAppAutomations, useToggleAutomation, useWhatsAppLogs } from "@/hooks/useWhatsApp";
import { useProfessional } from "@/hooks/useProfessional";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ConversationsList from "@/components/automations/ConversationsList";

const triggerLabels: Record<string, string> = {
  booking_created: "Novo booking",
  reminder_24h: "24h antes",
  reminder_3h: "3h antes",
  post_service: "Após conclusão",
  post_sale_review: "24h após conclusão",
  maintenance_reminder: "Manutenção próxima",
  reactivation_30d: "30 dias inativo",
  course_enrollment_confirmed: "Inscrição confirmada",
  course_payment_confirmed: "Pagamento confirmado",
  course_reminder_7d: "7 dias antes",
  course_reminder_1d: "1 dia antes",
  course_reminder_day: "No dia do curso",
  course_send_location: "Envio de localização",
  course_send_link: "Link da aula online",
  course_rescheduled: "Turma remarcada",
  course_cancelled: "Turma cancelada",
  course_waitlist_new_class: "Nova turma (lista de espera)",
  course_certificate_sent: "Certificado enviado",
  course_followup: "Follow-up pós-curso",
  course_feedback_request: "Pedido de feedback",
  course_next_offer: "Oferta de próximo curso",
};

const triggerDescriptions: Record<string, string> = {
  booking_created: "Enviada automaticamente após um novo agendamento",
  reminder_24h: "Lembrete enviado 24 horas antes do horário",
  reminder_3h: "Lembrete enviado 3 horas antes do horário",
  post_service: "Agradecimento após conclusão do serviço",
  post_sale_review: "Pedido de avaliação 24h após o serviço — avaliação vai para o profissional/funcionário que atendeu",
  maintenance_reminder: "Lembrete quando a manutenção do serviço está próxima",
  reactivation_30d: "Enviada para clientes inativos há 30 dias",
  course_enrollment_confirmed: "Enviada ao aluno quando a inscrição é confirmada",
  course_payment_confirmed: "Enviada ao aluno quando o pagamento é confirmado",
  course_reminder_7d: "Lembrete 7 dias antes do início da turma",
  course_reminder_1d: "Lembrete 1 dia antes do início da turma",
  course_reminder_day: "Lembrete no dia do curso",
  course_send_location: "Envia localização para aulas presenciais",
  course_send_link: "Envia o link de acesso para aulas online",
  course_rescheduled: "Avisa alunos quando uma turma é remarcada",
  course_cancelled: "Avisa alunos quando uma turma é cancelada",
  course_waitlist_new_class: "Avisa quem está na lista de espera sobre nova turma",
  course_certificate_sent: "Envia certificado de conclusão ao aluno",
  course_followup: "Follow-up 1 dia após o curso",
  course_feedback_request: "Solicita avaliação 3 dias após o curso",
  course_next_offer: "Oferece próximo curso relevante ao aluno",
};

const Automations = () => {
  const { data: instance, isLoading: loadingInstance } = useWhatsAppInstance();
  const { data: automations, isLoading: loadingAuto } = useWhatsAppAutomations();
  const { data: logs } = useWhatsAppLogs();
  const { data: professional } = useProfessional();
  const toggleAutomation = useToggleAutomation();
  const qc = useQueryClient();

  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [reminderMessage, setReminderMessage] = useState("");
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [followupMessage, setFollowupMessage] = useState("");
  const [savingMessages, setSavingMessages] = useState(false);

  // Course automation template editing
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [courseTemplates, setCourseTemplates] = useState<Record<string, string>>({});
  const [savingCourseTemplate, setSavingCourseTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (professional) {
      setWelcomeMessage(professional.welcome_message || "");
      setReminderMessage(professional.reminder_message || "");
      setConfirmationMessage(professional.confirmation_message || "");
      setFollowupMessage(professional.followup_message || "");
    }
  }, [professional]);

  // Initialize course templates from automations
  useEffect(() => {
    if (automations) {
      const templates: Record<string, string> = {};
      automations
        .filter(a => a.trigger_type.startsWith("course_"))
        .forEach(a => { templates[a.id] = a.message_template || ""; });
      setCourseTemplates(templates);
    }
  }, [automations]);

  const isLoading = loadingInstance || loadingAuto;

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      await toggleAutomation.mutateAsync({ id, is_active: !currentState });
      toast.success(!currentState ? "Automação ativada" : "Automação desativada");
    } catch { toast.error("Erro ao alterar automação"); }
  };

  const handleSaveMessages = async () => {
    if (!professional) return;
    setSavingMessages(true);
    const { error } = await supabase
      .from("professionals")
      .update({
        welcome_message: welcomeMessage.trim(),
        reminder_message: reminderMessage.trim(),
        confirmation_message: confirmationMessage.trim(),
        followup_message: followupMessage.trim(),
      })
      .eq("id", professional.id);

    if (error) {
      toast.error("Erro ao salvar mensagens");
    } else {
      toast.success("Mensagens de automação salvas!");
      qc.invalidateQueries({ queryKey: ["professional"] });
    }
    setSavingMessages(false);
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

      {/* Automation Messages */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Sparkles size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Mensagens Personalizadas</h3>
            <p className="text-xs text-muted-foreground">
              Use: {"{nome}"}, {"{servico}"}, {"{data}"}, {"{horario}"}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm mb-1.5">Mensagem de Boas-vindas</Label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Olá {nome}! Seja bem-vindo(a)..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Mensagem de Lembrete</Label>
            <textarea
              value={reminderMessage}
              onChange={(e) => setReminderMessage(e.target.value)}
              placeholder="Olá {nome}! Lembrete: você tem um agendamento..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Mensagem de Confirmação</Label>
            <textarea
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              placeholder="Olá {nome}! Seu agendamento para {servico} foi confirmado..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>
          <div>
            <Label className="text-sm mb-1.5">Mensagem de Follow-up (clientes que não finalizaram)</Label>
            <textarea
              value={followupMessage}
              onChange={(e) => setFollowupMessage(e.target.value)}
              placeholder="Olá {nome}! Notamos que você não finalizou seu agendamento..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          <Button
            onClick={handleSaveMessages}
            disabled={savingMessages}
            className="w-full h-10 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {savingMessages ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Salvar Mensagens
          </Button>
        </div>
      </motion.div>

      {/* Conversations */}
      <div className="mb-8">
        <ConversationsList />
      </div>

      {/* Automations List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : !automations?.length ? (
        <p className="text-center text-muted-foreground py-12">Nenhuma automação configurada</p>
      ) : (
        <div className="space-y-6">
          {/* Booking Automations */}
          {(() => {
            const bookingAutos = automations.filter(a => !a.trigger_type.startsWith("course_"));
            const courseAutos = automations.filter(a => a.trigger_type.startsWith("course_"));
            return (
              <>
                {bookingAutos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">📅 Agendamentos</h3>
                    <div className="space-y-3">
                      {bookingAutos.map((auto, i) => (
                        <motion.div key={auto.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.04 }} className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                              <Zap size={18} className="text-accent" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{triggerLabels[auto.trigger_type] || auto.trigger_type}</h3>
                              <p className="text-sm text-muted-foreground">{triggerDescriptions[auto.trigger_type] || ""}</p>
                            </div>
                          </div>
                          <button onClick={() => handleToggle(auto.id, auto.is_active)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {auto.is_active ? <ToggleRight size={28} className="text-success" /> : <ToggleLeft size={28} />}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {courseAutos.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6">🎓 Cursos</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Variáveis: {"{nome}"}, {"{curso}"}, {"{turma}"}, {"{data}"}, {"{horario}"}, {"{local}"}, {"{link_aula}"}, {"{link}"}, {"{valor}"}, {"{link_certificado}"}
                    </p>
                    <div className="space-y-3">
                      {courseAutos.map((auto, i) => (
                        <motion.div key={auto.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }} className="glass-card rounded-2xl p-5 flex items-center justify-between hover-lift">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Zap size={18} className="text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{triggerLabels[auto.trigger_type] || auto.trigger_type}</h3>
                              <p className="text-sm text-muted-foreground">{triggerDescriptions[auto.trigger_type] || ""}</p>
                            </div>
                          </div>
                          <button onClick={() => handleToggle(auto.id, auto.is_active)} className="text-muted-foreground hover:text-foreground transition-colors">
                            {auto.is_active ? <ToggleRight size={28} className="text-success" /> : <ToggleLeft size={28} />}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Automations;
