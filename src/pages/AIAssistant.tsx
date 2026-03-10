import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfessional } from "@/hooks/useProfessional";
import { useAuth } from "@/hooks/useAuth";
import { Send, Loader2, User, Sparkles, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import lisAvatar from "@/assets/lis-avatar.jpg";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/salon-ai-assistant`;

const suggestedQuestions = [
  { icon: TrendingUp, text: "Faça uma análise completa do meu negócio e me diga onde posso faturar mais" },
  { icon: Users, text: "Quantos clientes inativos eu tenho e quanto posso faturar reativando eles?" },
  { icon: DollarSign, text: "Quais serviços precisam de promoção e quais posso aumentar o preço?" },
  { icon: Calendar, text: "Quais horários estão vazios e como posso preencher minha agenda?" },
];

const AIAssistant = () => {
  const { data: professional } = useProfessional();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const streamChat = async (allMessages: Msg[]) => {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ messages: allMessages }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
      throw new Error(err.error || `Erro ${resp.status}`);
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch { /* ignore */ }
      }
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(updated);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${e.message || "Erro ao processar. Tente novamente."}` },
      ]);
    }
    setIsLoading(false);
  };

  return (
    <DashboardLayout title="Lis — Assistente IA" subtitle="Sua consultora especialista em negócios de beleza">
      <div className="max-w-3xl mx-auto glass-card rounded-2xl flex flex-col h-[calc(100dvh-180px)] md:h-[calc(100dvh-160px)] overflow-hidden">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Avatar className="w-20 h-20 mb-4 ring-2 ring-accent/30 ring-offset-2 ring-offset-background">
                <AvatarImage src={lisAvatar} alt="Lis - Assistente IA" className="object-cover" />
                <AvatarFallback className="bg-accent/10 text-accent text-xl font-bold">L</AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-foreground mb-1">
                Olá, {professional?.name?.split(" ")[0] || ""}! Eu sou a Lis 👋
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md">
                Sou sua assistente especialista em negócios de beleza. Analiso seus dados em tempo real para te ajudar a crescer e tomar as melhores decisões.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q.text)}
                    className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted border border-border text-left transition-colors group"
                  >
                    <q.icon size={16} className="text-accent shrink-0" />
                    <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                      {q.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <Avatar className="w-8 h-8 shrink-0 mt-1 ring-1 ring-accent/20">
                    <AvatarImage src={lisAvatar} alt="Lis" className="object-cover" />
                    <AvatarFallback className="bg-accent/10 text-accent text-xs font-bold">L</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-accent text-accent-foreground rounded-br-md"
                      : "bg-muted text-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>p]:mb-3 [&>ul]:mb-3 [&>ol]:mb-3 [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:mt-3 [&>h3]:mb-1.5 [&>p]:leading-relaxed [&>ul]:leading-relaxed [&>li]:mb-1">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <User size={16} className="text-primary" />
                  </div>
                )}
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <Avatar className="w-8 h-8 shrink-0 ring-1 ring-accent/20">
                <AvatarImage src={lisAvatar} alt="Lis" className="object-cover" />
                <AvatarFallback className="bg-accent/10 text-accent text-xs font-bold">L</AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-accent" />
                  <span className="text-xs text-muted-foreground">Lis está analisando seus dados...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Pergunte para a Lis sobre seu negócio..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
              disabled={isLoading}
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
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

export default AIAssistant;
