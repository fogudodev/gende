import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  Send, Megaphone, Loader2, Users, Clock, AlertTriangle,
  CheckCircle2, XCircle, Plus, Phone,
  ShoppingCart, Package, Eye, Receipt,
} from "lucide-react";
import { useProfessional } from "@/hooks/useProfessional";
import { useClients } from "@/hooks/useClients";
import { useCampaigns, useCampaignLimits, useSendCampaign, useCampaignContacts, useAddonPurchases } from "@/hooks/useCampaigns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { getPackagesByType, type AddonType } from "@/lib/addon-packages";
import type { Tables } from "@/integrations/supabase/types";

type Campaign = Tables<"campaigns">;
type CampaignContact = Tables<"campaign_contacts">;
type AddonPurchase = Tables<"addon_purchases">;

const MAX_NAME_LENGTH = 100;
const MAX_MESSAGE_LENGTH = 1000;
const CLIENTS_PAGE_SIZE = 50;

// Static maps outside component to avoid re-creation
const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sending: "Enviando",
  completed: "Concluída",
  failed: "Falhou",
};
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sending: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  failed: "bg-destructive/10 text-destructive",
};
const CONTACT_STATUS_COLORS: Record<string, string> = {
  sent: "text-emerald-700 dark:text-emerald-400",
  failed: "text-destructive",
  pending: "text-muted-foreground",
};
const CONTACT_STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  sent: CheckCircle2,
  failed: XCircle,
  pending: Clock,
};
const CONTACT_STATUS_LABELS: Record<string, string> = {
  sent: "Enviada",
  failed: "Falhou",
  pending: "Pendente",
};

const Campaigns = () => {
  const { data: professional } = useProfessional();
  const { data: campaigns, isLoading } = useCampaigns();
  const { data: limitsData, refetch: refetchLimits } = useCampaignLimits();
  const { data: clients } = useClients();
  const sendCampaign = useSendCampaign();
  const { data: purchases } = useAddonPurchases();
  const [showNew, setShowNew] = useState(false);
  const [detailCampaignId, setDetailCampaignId] = useState<string | null>(null);
  const { data: contacts, isLoading: loadingContacts } = useCampaignContacts(detailCampaignId);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [showAddons, setShowAddons] = useState(false);
  const [buyingAddon, setBuyingAddon] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientsVisible, setClientsVisible] = useState(CLIENTS_PAGE_SIZE);

  // Clients with phone, filtered and paginated
  const clientsWithPhone = useMemo(
    () => (clients || []).filter(c => c.phone),
    [clients]
  );
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clientsWithPhone;
    const q = clientSearch.toLowerCase();
    return clientsWithPhone.filter(c => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
  }, [clientsWithPhone, clientSearch]);
  const visibleClients = useMemo(
    () => filteredClients.slice(0, clientsVisible),
    [filteredClients, clientsVisible]
  );

  // Auto-verify addon payment on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("addon_session_id");
    if (!sessionId || !professional) return;

    const verify = async () => {
      setVerifying(true);
      window.history.replaceState({}, "", window.location.pathname);
      try {
        const { data, error } = await supabase.functions.invoke("purchase-addon", {
          body: { action: "verify-payment", sessionId, professionalId: professional.id },
        });
        if (error) throw error;
        if (data?.success) {
          const typeLabels: Record<string, string> = { reminders: "lembretes", campaigns: "campanhas", contacts: "contatos" };
          toast.success(`✅ ${data.quantity} ${typeLabels[data.type] || "extras"} adicionados à sua conta!`);
          refetchLimits();
        } else {
          toast.error(data?.error || "Pagamento não confirmado ainda. Tente novamente em instantes.");
        }
      } catch (err: any) {
        toast.error("Erro ao verificar pagamento: " + (err.message || ""));
      } finally {
        setVerifying(false);
      }
    };
    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professional?.id]);

  const handleBuyAddon = async (priceId: string) => {
    if (!professional) return;
    setBuyingAddon(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("purchase-addon", {
        body: { action: "create-checkout", priceId, professionalId: professional.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar compra");
    } finally {
      setBuyingAddon(null);
    }
  };

  const handleSendConfirmed = async () => {
    if (!professional || !name.trim() || !message.trim()) return;
    setSending(true);
    setConfirmSend(false);
    try {
      const result = await sendCampaign.mutateAsync({
        professionalId: professional.id,
        name: name.trim().slice(0, MAX_NAME_LENGTH),
        message: message.trim().slice(0, MAX_MESSAGE_LENGTH),
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

  const handleSendClick = () => {
    if (!name.trim() || !message.trim()) {
      toast.error("Preencha nome e mensagem da campanha");
      return;
    }
    setConfirmSend(true);
  };

  const toggleClient = useCallback((clientId: string, checked: boolean) => {
    setSelectedClients(prev =>
      checked ? [...prev, clientId] : prev.filter(id => id !== clientId)
    );
  }, []);

  const limits = limitsData?.limits;
  const usage = limitsData?.usage;
  const extras = limitsData?.extras || { extra_reminders: 0, extra_campaigns: 0, extra_contacts: 0 };

  const effectiveCampaigns = limits ? (limits.daily_campaigns === -1 ? -1 : limits.daily_campaigns + extras.extra_campaigns) : 0;
  const effectiveReminders = limits ? (limits.daily_reminders === -1 ? -1 : limits.daily_reminders + extras.extra_reminders) : 0;
  const effectiveContacts = limits ? (limits.campaign_max_contacts === -1 ? -1 : limits.campaign_max_contacts + extras.extra_contacts) : 0;

  const targetCount = selectedClients.length > 0 ? selectedClients.length : clientsWithPhone.length;

  return (
    <DashboardLayout title="Campanhas" subtitle="Envie mensagens para seus clientes">
      {/* Limits info */}
      {limits ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card rounded-2xl p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-24 mb-2" />
              <div className="h-6 bg-muted rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Addon Store Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button
          variant="outline"
          onClick={() => setShowAddons(true)}
          className="w-full rounded-2xl py-6 border-dashed border-accent/30 hover:bg-accent/5 mb-4"
        >
          <ShoppingCart size={16} className="text-accent mr-2" /> Comprar Extras (Lembretes, Campanhas, Contatos)
        </Button>
      </motion.div>

      {/* New Campaign Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button
          onClick={() => setShowNew(true)}
          className="w-full rounded-2xl py-6 mb-6 gap-2"
        >
          <Plus size={18} /> Nova Campanha
        </Button>
      </motion.div>

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
          {(campaigns as Campaign[]).map((c, i) => (
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
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", STATUS_COLORS[c.status] || "bg-muted")}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                  <Eye size={14} className="text-muted-foreground" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.message}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users size={12} /> {c.total_contacts} contatos</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> {c.sent_count} enviadas</span>
                {c.failed_count > 0 && (
                  <span className="flex items-center gap-1"><XCircle size={12} className="text-destructive" /> {c.failed_count} falhas</span>
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
            <div className="space-y-2">
              <Label>
                Nome da campanha * <span className="text-xs text-muted-foreground">({name.length}/{MAX_NAME_LENGTH})</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
                placeholder="Ex: Promoção de Natal"
                maxLength={MAX_NAME_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Mensagem * <span className="text-xs text-muted-foreground">({message.length}/{MAX_MESSAGE_LENGTH})</span>
              </Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder="Olá {nome}! Temos uma promoção especial..."
                rows={4}
                maxLength={MAX_MESSAGE_LENGTH}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">Variáveis: {"{nome}"}, {"{link}"}, {"{negocio}"}</p>
            </div>

            {limits && (
              <div className="flex items-start gap-2 bg-accent/5 rounded-xl p-3">
                <AlertTriangle size={14} className="text-accent mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p>Plano <strong className="text-foreground">{limitsData?.planId?.toUpperCase()}</strong>: máx {limits.campaign_max_contacts === -1 ? "ilimitados" : limits.campaign_max_contacts} contatos por campanha, intervalo mínimo de {limits.campaign_min_interval_hours}h entre campanhas.</p>
                </div>
              </div>
            )}

            {/* Client selection */}
            <div className="space-y-2">
              <Label>
                Destinatários <span className="text-xs text-muted-foreground">(vazio = todos os clientes)</span>
              </Label>
              {clientsWithPhone.length > 10 && (
                <Input
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setClientsVisible(CLIENTS_PAGE_SIZE); }}
                  placeholder="Buscar cliente..."
                  className="mb-1"
                />
              )}
              <div className="max-h-40 overflow-y-auto space-y-1 bg-muted/30 rounded-xl p-2">
                {visibleClients.map(c => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer text-sm">
                    <Checkbox
                      checked={selectedClients.includes(c.id)}
                      onCheckedChange={(checked) => toggleClient(c.id, !!checked)}
                    />
                    <span className="text-foreground">{c.name}</span>
                    <span className="text-muted-foreground text-xs">{c.phone}</span>
                  </label>
                ))}
                {filteredClients.length > clientsVisible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setClientsVisible(prev => prev + CLIENTS_PAGE_SIZE)}
                  >
                    Mostrar mais ({filteredClients.length - clientsVisible} restantes)
                  </Button>
                )}
                {clientsWithPhone.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Nenhum cliente com telefone</p>
                )}
                {clientsWithPhone.length > 0 && filteredClients.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">Nenhum cliente encontrado</p>
                )}
              </div>
              {selectedClients.length > 0 && (
                <p className="text-xs text-accent">{selectedClients.length} selecionados</p>
              )}
            </div>

            <Button
              onClick={handleSendClick}
              disabled={sending || !name.trim() || !message.trim()}
              className="w-full gap-2"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {sending ? "Enviando..." : "Enviar Campanha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Confirmation AlertDialog */}
      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio de campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha "<strong>{name}</strong>" será enviada para{" "}
              <strong>{targetCount}</strong> contato{targetCount !== 1 ? "s" : ""}. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendConfirmed} disabled={sending}>
              {sending ? "Enviando..." : "Confirmar Envio"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Campaign Detail Dialog */}
      <Dialog open={!!detailCampaignId} onOpenChange={(open) => !open && setDetailCampaignId(null)}>
        <DialogContent className="max-w-lg bg-background border-border max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <Megaphone size={18} className="text-accent" />
              {(campaigns as Campaign[] | undefined)?.find(c => c.id === detailCampaignId)?.name || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          {loadingContacts ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted-foreground" size={24} /></div>
          ) : !contacts?.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum contato registrado</p>
          ) : (
            <div className="overflow-y-auto space-y-2 pr-1">
              <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" /> {(contacts as CampaignContact[]).filter(c => c.status === "sent").length} enviadas</span>
                <span className="flex items-center gap-1"><XCircle size={12} className="text-destructive" /> {(contacts as CampaignContact[]).filter(c => c.status === "failed").length} falhas</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {(contacts as CampaignContact[]).filter(c => c.status === "pending").length} pendentes</span>
              </div>
              {(contacts as CampaignContact[]).map((contact) => {
                const Icon = CONTACT_STATUS_ICONS[contact.status] || Clock;
                return (
                  <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon size={16} className={CONTACT_STATUS_COLORS[contact.status] || "text-muted-foreground"} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{contact.client_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {contact.phone}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={cn("text-xs font-semibold", CONTACT_STATUS_COLORS[contact.status])}>
                        {CONTACT_STATUS_LABELS[contact.status] || contact.status}
                      </span>
                      {contact.sent_at && (
                        <p className="text-[10px] text-muted-foreground">{format(new Date(contact.sent_at), "HH:mm:ss")}</p>
                      )}
                      {contact.error_message && (
                        <p className="text-[10px] text-destructive truncate max-w-[120px]" title={contact.error_message}>
                          {contact.error_message.length > 30 ? contact.error_message.slice(0, 30) + "..." : contact.error_message}
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
                      <Button
                        key={pkg.id}
                        variant="outline"
                        onClick={() => handleBuyAddon(pkg.priceId)}
                        disabled={!!buyingAddon}
                        className={cn(
                          "flex flex-col items-center gap-1 h-auto py-3 hover:bg-accent/10 hover:border-accent/50",
                          buyingAddon === pkg.priceId && "opacity-50"
                        )}
                      >
                        <span className="text-lg font-bold text-foreground">{pkg.quantity}</span>
                        <span className="text-[10px] text-muted-foreground">{type === "reminders" ? "lembretes" : type === "campaigns" ? "campanhas" : "contatos"}</span>
                        <span className="text-xs font-semibold text-accent mt-1">{pkg.priceDisplay}</span>
                        {buyingAddon === pkg.priceId && <Loader2 size={12} className="animate-spin text-accent" />}
                      </Button>
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

            {/* Purchase History */}
            {purchases && purchases.length > 0 && (
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Receipt size={16} className="text-accent" /> Histórico de Compras
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(purchases as AddonPurchase[]).map((p) => {
                    const typeLabels: Record<string, string> = { reminders: "Lembretes", campaigns: "Campanhas", contacts: "Contatos" };
                    const typeEmojis: Record<string, string> = { reminders: "📨", campaigns: "📣", contacts: "👥" };
                    return (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">{typeEmojis[p.addon_type] || "📦"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                              +{p.quantity} {typeLabels[p.addon_type] || p.addon_type}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(p.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-accent shrink-0">
                          R$ {(p.amount_cents / 100).toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Campaigns;
