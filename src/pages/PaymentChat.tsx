import { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "@/hooks/useProfessional";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Paperclip, Loader2, ImageIcon, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PaymentChat = () => {
  const { data: professional } = useProfessional();
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { markAsSeen } = useUnreadMessages();

  // Mark payment chat as seen when opening
  useEffect(() => {
    if (professional?.id) markAsSeen("payment");
  }, [professional?.id]);

  useChatNotifications({
    viewerRole: "user",
    professionalId: professional?.id,
    chatType: "payment",
    enabled: !!professional?.id,
  });

  const { data: messages, isLoading } = useQuery({
    queryKey: ["payment-chat", professional?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .eq("chat_type", "payment")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!professional?.id,
    refetchInterval: 5000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!professional?.id) return;
    const channel = supabase
      .channel("payment-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `professional_id=eq.${professional.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ["payment-chat", professional.id] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [professional?.id, qc]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (params: { message?: string; attachment_url?: string }) => {
      const { error } = await (supabase.from("chat_messages" as any) as any).insert({
        professional_id: professional!.id,
        sender_role: "user",
        sender_name: professional!.name,
        message: params.message || null,
        attachment_url: params.attachment_url || null,
        chat_type: "payment",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment-chat", professional?.id] });
      setMessage("");
    },
    onError: () => toast.error("Erro ao enviar mensagem"),
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ message: message.trim() });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !professional) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${professional.id}/comprovantes/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("professionals")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("professionals").getPublicUrl(path);

      await sendMessage.mutateAsync({
        message: "📎 Comprovante de pagamento enviado",
        attachment_url: urlData.publicUrl,
      });
      toast.success("Comprovante enviado!");
    } catch {
      toast.error("Erro ao enviar arquivo");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <DashboardLayout title="Chat de Pagamento" subtitle="Envie comprovantes de pagamento PIX">
      <div className="max-w-2xl mx-auto glass-card rounded-2xl flex flex-col h-[calc(100vh-200px)] overflow-hidden">
        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-accent" />
            </div>
          ) : messages && messages.length > 0 ? (
            messages.map((msg: any) => {
              const isUser = msg.sender_role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isUser
                        ? "bg-accent text-accent-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {!isUser && (
                      <p className="text-[10px] font-semibold mb-0.5 opacity-70">
                        {msg.sender_name || "Suporte"}
                      </p>
                    )}
                    {msg.message && <p className="text-sm">{msg.message}</p>}
                    {msg.attachment_url && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block"
                      >
                        <div className="flex items-center gap-2 bg-background/20 rounded-lg p-2 hover:bg-background/30 transition-colors">
                          <ImageIcon size={14} />
                          <span className="text-xs underline">Ver comprovante</span>
                        </div>
                      </a>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] opacity-60">
                        {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                      {isUser && <CheckCheck size={10} className="opacity-60" />}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                <Send size={20} className="text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">
                Envie seu comprovante de pagamento PIX aqui.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Nossa equipe irá validar e ativar seu plano.
              </p>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              title="Enviar comprovante"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Digite uma mensagem..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="p-2.5 rounded-xl gradient-accent text-accent-foreground hover-lift disabled:opacity-50 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentChat;
