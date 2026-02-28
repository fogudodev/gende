import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Clock, CheckCircle2, XCircle, Send, Loader2, ChevronDown, ChevronUp, User, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const statusLabels: Record<string, string> = {
  active: "Ativa",
  completed: "Concluída",
  expired: "Expirada",
  abandoned: "Abandonada",
};

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  completed: "bg-accent/10 text-accent",
  expired: "bg-muted text-muted-foreground",
  abandoned: "bg-destructive/10 text-destructive",
};

export const useConversations = (filter: string = "all") => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["whatsapp-conversations", professional?.id, filter],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_conversations")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (filter === "active") {
        query = query.eq("status", "active");
      } else if (filter === "abandoned") {
        query = query.in("status", ["expired", "abandoned"]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
    refetchInterval: 30000,
  });
};

const ConversationsList = () => {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sendingFollowUp, setSendingFollowUp] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { data: conversations, isLoading } = useConversations(filter);
  const { data: professional } = useProfessional();
  const qc = useQueryClient();

  const handleSendFollowUp = async (conv: any) => {
    if (!professional) return;
    setSendingFollowUp(conv.id);

    try {
      const { data, error } = await supabase.functions.invoke("whatsapp", {
        body: {
          action: "send-message",
          instanceName: "",
          phone: conv.client_phone,
          message: "",
          followUpConversationId: conv.id,
          professionalId: professional.id,
        },
      });

      // Use dedicated follow-up action
      const { error: fErr } = await supabase.functions.invoke("whatsapp-webhook", {
        body: {
          action: "send-follow-up",
          conversationId: conv.id,
          professionalId: professional.id,
        },
      });

      if (fErr) throw fErr;
      toast.success("Follow-up enviado com sucesso!");
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
    } catch {
      toast.error("Erro ao enviar follow-up");
    } finally {
      setSendingFollowUp(null);
    }
  };

  const handleDelete = async (convId: string) => {
    setConfirmDeleteId(null);
    setDeletingId(convId);
    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .delete()
        .eq("id", convId);
      if (error) throw error;
      toast.success("Conversa excluída!");
      qc.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      if (expandedId === convId) setExpandedId(null);
    } catch {
      toast.error("Erro ao excluir conversa");
    } finally {
      setDeletingId(null);
    }
  };

  const filters = [
    { key: "all", label: "Todas" },
    { key: "active", label: "Ativas" },
    { key: "abandoned", label: "Não finalizadas" },
  ];

  const messages = (conv: any): Array<{ role: string; content: string }> => {
    try {
      return Array.isArray(conv.messages) ? conv.messages : JSON.parse(conv.messages);
    } catch {
      return [];
    }
  };

  const isAbandoned = (conv: any) => ["expired", "abandoned"].includes(conv.status);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <MessageCircle size={18} className="text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Conversas do Bot</h3>
            <p className="text-xs text-muted-foreground">Acompanhe os atendimentos via WhatsApp</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-accent text-accent-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : !conversations?.length ? (
        <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma conversa encontrada</p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {conversations.map((conv) => {
            const msgs = messages(conv);
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const isExpanded = expandedId === conv.id;

            return (
              <div key={conv.id} className="rounded-xl border border-border bg-card/50 overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : conv.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User size={14} className="text-muted-foreground" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">
                        {(conv.context as any)?.client_name || conv.client_phone}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conv.client_phone} • {msgs.length} mensagens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[conv.status] || ""}`}>
                      {statusLabels[conv.status] || conv.status}
                    </Badge>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {/* Expanded messages */}
                {isExpanded && (
                  <div className="border-t border-border">
                    <div className="p-3 space-y-2 max-h-60 overflow-y-auto bg-muted/10">
                      {msgs.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                              msg.role === "assistant"
                                ? "bg-muted text-foreground"
                                : "bg-accent text-accent-foreground"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions for abandoned/expired conversations */}
                    {isAbandoned(conv) && (
                      <div className="p-3 border-t border-border flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendFollowUp(conv)}
                          disabled={sendingFollowUp === conv.id}
                          className="flex-1 h-8 text-xs"
                        >
                          {sendingFollowUp === conv.id ? (
                            <Loader2 size={12} className="animate-spin mr-1.5" />
                          ) : (
                            <Send size={12} className="mr-1.5" />
                          )}
                          Enviar follow-up automático
                        </Button>
                        {conv.status === "expired" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirmDeleteId(conv.id)}
                            disabled={deletingId === conv.id}
                            className="h-8 text-xs"
                          >
                            {deletingId === conv.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A conversa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ConversationsList;
