import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAllProfessionals } from "@/hooks/useAdmin";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send, Loader2, ImageIcon, CheckCheck, CreditCard, Paperclip, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const AdminPaymentChat = () => {
  const { data: professionals, isLoading: loadingPros } = useAllProfessionals();
  const [selectedProfId, setSelectedProfId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: conversations } = useQuery({
    queryKey: ["admin-payment-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("professional_id, created_at")
        .eq("chat_type", "payment")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map = new Map<string, string>();
      (data as any[]).forEach((m: any) => {
        if (!map.has(m.professional_id)) map.set(m.professional_id, m.created_at);
      });
      return map;
    },
    refetchInterval: 5000,
  });

  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ["admin-payment-chat", selectedProfId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages" as any)
        .select("*")
        .eq("professional_id", selectedProfId!)
        .eq("chat_type", "payment")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!selectedProfId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async (params: { message?: string; attachment_url?: string }) => {
      const { error } = await (supabase.from("chat_messages" as any) as any).insert({
        professional_id: selectedProfId!,
        sender_role: "support",
        sender_name: "Admin",
        message: params.message || null,
        attachment_url: params.attachment_url || null,
        chat_type: "payment",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-chat", selectedProfId] });
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
    if (!file || !selectedProfId) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `admin/pagamento/${selectedProfId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("professionals").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("professionals").getPublicUrl(path);
      await sendMessage.mutateAsync({ message: "📎 Arquivo enviado", attachment_url: urlData.publicUrl });
    } catch { toast.error("Erro ao enviar arquivo"); }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sortedPros = (professionals || [])
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aHas = conversations?.has(a.id) ? 1 : 0;
      const bHas = conversations?.has(b.id) ? 1 : 0;
      return bHas - aHas;
    });

  return (
    <AdminLayout title="Chat de Pagamento" subtitle="Validar comprovantes de pagamento dos usuários">
      <div className="flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-80 glass-card rounded-2xl flex flex-col overflow-hidden shrink-0 hidden md:flex">
          <div className="p-3 border-b border-border">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuário..." className="w-full px-3 py-2 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingPros ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
            ) : (
              sortedPros.map(p => {
                const hasConvo = conversations?.has(p.id);
                return (
                  <button key={p.id} onClick={() => setSelectedProfId(p.id)} className={cn("w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors", selectedProfId === p.id && "bg-accent/10")}>
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0", hasConvo ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground")}><User size={14} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name || p.business_name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.email}</p>
                      </div>
                      {hasConvo && <div className="w-2 h-2 rounded-full bg-accent ml-auto shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 glass-card rounded-2xl flex flex-col overflow-hidden">
          {!selectedProfId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <CreditCard size={32} className="text-accent mb-3" />
              <p className="text-sm text-muted-foreground">Selecione um usuário para ver comprovantes</p>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-accent" /></div>
                ) : messages && messages.length > 0 ? (
                  messages.map((msg: any) => {
                    const isSupport = msg.sender_role !== "user";
                    return (
                      <div key={msg.id} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isSupport ? "bg-accent text-accent-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
                          {!isSupport && <p className="text-[10px] font-semibold mb-0.5 opacity-70">{msg.sender_name || "Usuário"}</p>}
                          {msg.message && <p className="text-sm">{msg.message}</p>}
                          {msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                              <div className="flex items-center gap-2 bg-background/20 rounded-lg p-2 hover:bg-background/30 transition-colors"><ImageIcon size={14} /><span className="text-xs underline">Ver comprovante</span></div>
                            </a>
                          )}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[9px] opacity-60">{format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}</span>
                            {isSupport && <CheckCheck size={10} className="opacity-60" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
                  </div>
                )}
              </div>
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
                  </button>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Responder..." className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
                  <button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending} className="p-2.5 rounded-xl gradient-accent text-accent-foreground hover-lift disabled:opacity-50 transition-all">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentChat;
