import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  Send, Megaphone, Loader2, Users, Clock, AlertTriangle,
  CheckCircle2, XCircle, Plus, MessageSquare, Eye, Phone,
  ShoppingCart, Package,
} from "lucide-react";
import { useProfessional } from "@/hooks/useProfessional";
import { useClients } from "@/hooks/useClients";
import { useCampaigns, useCampaignLimits, useSendCampaign, useCampaignContacts } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ADDON_PACKAGES, getPackagesByType, type AddonType } from "@/lib/addon-packages";
const Campaigns = () => {
  const { data: professional } = useProfessional();
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: limitsData } = useCampaignLimits();
  const { data: clients } = useClients();
  const sendCampaign = useSendCampaign();
  const [showNew, setShowNew] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const { data: contacts, isLoading: loadingContacts } = useCampaignContacts(detailCampaignId);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const [buyingAddon, setBuyingAddon] = useState<string | null>(null);

  const handleBuyAddon = async (priceId: string) => {
    if (!professional) return;
    setBuyingAddon(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-addon", {
        body: { action: "create-checkout", priceId, professionalId: professional.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar compra");
    } finally {
      setBuyingAddon(null);
    }
  };

  const handleSend = async () => {
    if (!professional || !name.trim() || !message.trim()) {
      toast.error("Preencha nome e mensagem da campanha");
      return;
    }
    setSending(true);
    try {
      const result = await sendCampaign.mutateAsync({
        professionalId: professional.id,
        name: name.trim(),
        message: message.trim(),
        clientIds: selectedClients.length > 0 ? selectedClients : undefined,
      });
      toast.success(`Campanha enviada! ${result.sent} de ${result.total} mensagens`);
      setShowNew(false);
      setName("");
      setMessage("");
      setSelectedClients([]);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar campanha");
    } finally {
      setSending(false);
    }
  };

  const limits = limitsData?.limits;
  const usage = limitsData?.usage;
  const extras = limitsData?.extras || { extra_reminders: 0, extra_campaigns: 0, extra_contacts: 0 };

  const effectiveCampaigns = limits ? (limits.daily_campaigns === -1 ? -1 : limits.daily_campaigns + extras.extra_campaigns) : 0;
  const effectiveReminders = limits ? (limits.daily_reminders === -1 ? -1 : limits.daily_reminders + extras.extra_reminders) : 0;
  const effectiveContacts = limits ? (limits.campaign_max_contacts === -1 ? -1 : limits.campaign_max_contacts + extras.extra_contacts) : 0;

  const statusLabels: Record<string, string> = {
    draft: "Rascunho",
    sending: "Enviando",
    completed: "Concluída",
    failed: "Falhou",
  };
  const statusColors: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    sending: "bg-yellow-500/10 text-yellow-600",
    completed: "bg-emerald-500/10 text-emerald-500",
    failed: "bg-red-500/10 text-red-500",
  };

  return (
    <DashboardLayout title="Campanhas" subtitle="Envie mensagens para seus clientes">
      {/* Limits info */}
      {limits && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Campanhas hoje</span>
              <Megaphone size={14} className="text-accent" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {usage?.campaigns_sent || 0}
              <span className="text-sm font-normal text-muted-foreground">
                /{effectiveCampaigns === -1 ? "∞" : effectiveCampaigns}
              </span>
            </p>
            {extras.extra_campaigns > 0 && <p className="text-[10px] text-accent mt-1">+{extras.extra_campaigns} extras</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Lembretes hoje</span>
              <Clock size={14} className="text-accent" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {usage?.reminders_sent || 0}
              <span className="text-sm font-normal text-muted-foreground">
                /{effectiveReminders === -1 ? "∞" : effectiveReminders}
              </span>
            </p>
            {extras.extra_reminders > 0 && <p className="text-[10px] text-accent mt-1">+{extras.extra_reminders} extras</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Máx. contatos/campanha</span>
              <Users size={14} className="text-accent" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {effectiveContacts === -1 ? "∞" : effectiveContacts}
            </p>
            {extras.extra_contacts > 0 && <p className="text-[10px] text-accent mt-1">+{extras.extra_contacts} extras</p>}
          </motion.div>
        </div>
      )}

      {/* Addon Store Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setShowAddons(true)}
        className="w-full glass-card rounded-2xl p-4 flex items-center justify-center gap-2 text-foreground font-medium hover:bg-accent/5 transition-colors mb-4 border border-dashed border-accent/30"
      >
        <ShoppingCart size={16} className="text-accent" /> Comprar Extras (Lembretes, Campanhas, Contatos)
      </motion.button>

      {/* New Campaign Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => setShowNew(true)}
        className="w-full glass-card rounded-2xl p-5 flex items-center justify-center gap-2 text-accent font-semibold hover:bg-accent/5 transition-colors mb-6"
      >
        <Plus size={18} /> Nova Campanha
      </motion.button>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted-foreground" size={28} /></div>
      ) : !campaigns?.length ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <Megaphone size={40} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhuma campanha enviada ainda</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-card rounded-2xl p-5 cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
              onClick={() => setDetailCampaignId(c.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{c.name}</h3>
                <div className="flex items-center gap-2">
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", statusColors[c.status] || "bg-muted")}>
                    {statusLabels[c.status] || c.status}
                  </span>
                  <Eye size={14} className="text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.message}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users size={12} /> {c.total_contacts} contatos</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {c.sent_count} enviadas</span>
                {c.failed_count > 0 && (
                  <span className="flex items-center gap-1"><XCircle size={12} className="text-red-500" /> {c.failed_count} falhas</span>
                )}
                {c.created_at && (
                  <span>{format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* New Campaign Dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nova Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome da campanha</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Promoção de Natal"
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mensagem</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Olá {nome}! Temos uma promoção especial..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Variáveis: {"{nome}"}, {"{link}"}, {"{negocio}"}</p>
            </div>

            {limits && (
              <div className="flex items-start gap-2 bg-accent/5 rounded-xl p-3">
                <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p>Plano <strong className="text-foreground">{limitsData?.planId?.toUpperCase()}</strong>: máx {limits.campaign_max_contacts === -1 ? "ilimitados" : limits.campaign_max_contacts} contatos por campanha, intervalo mínimo de {limits.campaign_min_interval_hours}h entre campanhas.</p>
                </div>
              </div>
            )}

            {/* Client selection (optional) */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Destinatários <span className="text-xs text-muted-foreground">(vazio = todos os clientes)</span>
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 bg-muted/30 rounded-xl p-2">
                {(clients || []).filter(c => c.phone).map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedClients(prev => [...prev, c.id]);
                        else setSelectedClients(prev => prev.filter(id => id !== c.id));
                      }}
                      className="rounded accent-accent"
                    />
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </label>
                ))}
                {(clients || []).filter(c => c.phone).length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Nenhum cliente com telefone</p>
                )}
              </div>
              {selectedClients.length > 0 && (
                <p className="text-xs text-accent mt-1">{selectedClients.length} selecionados</p>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !name.trim() || !message.trim()}
              className="w-full py-3 rounded-xl gradient-accent text-accent-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Enviando..." : "Enviar Campanha"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Campaign Detail Dialog */}
      <Dialog open={!!detailCampaignId} onOpenChange={(open) => !open && setDetailCampaignId(null)}>
        <DialogContent className="max-w-lg bg-background border-border max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Megaphone size={18} className="text-accent" />
              {campaigns?.find((c: any) => c.id === detailCampaignId)?.name || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          {loadingContacts ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
          ) : !contacts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato registrado</p>
          ) : (
            <div className="overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {contacts.filter(c => c.status === "sent").length} enviadas</span>
                <span className="flex items-center gap-1"><XCircle size={12} className="text-destructive" /> {contacts.filter(c => c.status === "failed").length} falhas</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {contacts.filter(c => c.status === "pending").length} pendentes</span>
              </div>
              {contacts.map((contact: any) => {
                const contactStatusColors: Record<string, string> = {
                  sent: "text-emerald-500",
                  failed: "text-destructive",
                  pending: "text-muted-foreground",
                };
                const contactStatusIcons: Record<string, any> = {
                  sent: CheckCircle2,
                  failed: XCircle,
                  pending: Clock,
                };
                const contactStatusLabels: Record<string, string> = {
                  sent: "Enviada",
                  failed: "Falhou",
                  pending: "Pendente",
                };
                const Icon = contactStatusIcons[contact.status] || Clock;
                return (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={16} className={contactStatusColors[contact.status] || "text-muted-foreground"} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.client_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {contact.phone}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={cn("text-xs font-semibold", contactStatusColors[contact.status])}>
                        {contactStatusLabels[contact.status] || contact.status}
                      </span>
                      {contact.sent_at && (
                        <p className="text-[10px] text-muted-foreground">{format(new Date(contact.sent_at), "HH:mm:ss")}</p>
                      )}
                      {contact.error_message && (
                        <p className="text-[10px] text-destructive truncate max-w-[120px]" title={contact.error_message}>
                          {contact.error_message.slice(0, 30)}...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Addon Store Dialog */}
      <Dialog open={showAddons} onOpenChange={setShowAddons}>
        <DialogContent className="max-w-lg bg-background border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Package size={18} className="text-accent" />
              Loja de Extras
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-2">
            {(["reminders", "campaigns", "contacts"] as AddonType[]).map((type) => {
              const typeLabels: Record<AddonType, string> = {
                reminders: "📨 Lembretes Extras",
                campaigns: "📣 Campanhas Extras",
                contacts: "👥 Contatos por Campanha",
              };
              const typeDescs: Record<AddonType, string> = {
                reminders: "Envie mais lembretes de agendamento por dia",
                campaigns: "Envie mais campanhas de marketing por dia",
                contacts: "Aumente o limite de contatos por campanha",
              };
              const packages = getPackagesByType(type);
              return (
                <div key={type}>
                  <h3 className="font-semibold text-foreground mb-1">{typeLabels[type]}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{typeDescs[type]}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        onClick={() => handleBuyAddon(pkg.priceId)}
                        disabled={!!buyingAddon}
                        className={cn(
                          "flex flex-col items-center gap-1 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-accent/10 hover:border-accent/50 transition-all text-center",
                          buyingAddon === pkg.priceId && "opacity-50"
                        )}
                      >
                        <span className="text-lg font-bold text-foreground">{pkg.quantity}</span>
                        <span className="text-[10px] text-muted-foreground">{type === "reminders" ? "lembretes" : type === "campaigns" ? "campanhas" : "contatos"}</span>
                        <span className="text-xs font-semibold text-accent mt-1">{pkg.priceDisplay}</span>
                        {buyingAddon === pkg.priceId && <Loader2 size={12} className="animate-spin text-accent" />}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex items-start gap-2 bg-accent/5 rounded-xl p-3">
              <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Os extras são adicionados ao seu limite atual do plano. Após o pagamento, o crédito é aplicado automaticamente à sua conta.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Campaigns;
