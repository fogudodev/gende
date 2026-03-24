import { Bell, Search, Sun, Moon, Menu, Crown, Headphones, Sparkles, Wallet, CreditCard, MessageSquare, CheckCheck, Clock } from "lucide-react";
import aiAssistantIcon from "@/assets/icon-ai-assistant.png";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useProfessional } from "@/hooks/useProfessional";
import { useState, useRef, useEffect } from "react";
import PlanRenewalModal from "./PlanRenewalModal";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useSubscription } from "@/hooks/useSubscription";
import { formatDistanceToNow, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const TopBar = ({ title, subtitle, onMenuClick }: TopBarProps) => {
  const { theme, setTheme } = useTheme();
  const { data: professional } = useProfessional();
  const [renewalOpen, setRenewalOpen] = useState(false);
  const { currentPlan } = useFeatureAccess();
  const { unreadCount, unreadPayment, unreadSupport, recentMessages, markAllAsSeen } = useUnreadMessages();
  const { data: subscription } = useSubscription();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Calculate trial remaining days
  const trialDaysRemaining = (() => {
    if (!subscription) return null;
    const endDate = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
    if (!endDate || subscription.status !== "active") return null;
    const days = differenceInDays(endDate, new Date());
    return days >= 0 ? days : null;
  })();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  return (
    <>
    <PlanRenewalModal open={renewalOpen} onOpenChange={setRenewalOpen} />
    <header className="h-14 md:h-16 border-b border-border px-3 md:px-4 lg:px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors md:hidden"
          aria-label="Abrir menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-foreground">
            <path d="M5 17H13M5 12H19M11 7H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-foreground font-display whitespace-nowrap truncate max-w-[120px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-none">{title}</h1>
          {subtitle && (
            <p className="text-[10px] md:text-xs text-muted-foreground hidden lg:block truncate max-w-[280px]">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 shrink-0 min-w-0">
        <div className="relative hidden lg:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-[200px] transition-all"
          />
        </div>
        <button
          onClick={() => setRenewalOpen(true)}
          className="flex items-center gap-1.5 px-2 md:px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
          title="Gerenciar plano"
        >
          <Crown size={14} />
          <span className="hidden lg:inline">
            {currentPlan === "none" ? "Assinar" : currentPlan === "essencial" ? "Essencial" : "Enterprise"}
          </span>
        </button>
        {trialDaysRemaining !== null && (
          <div className={`flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-semibold ${
            trialDaysRemaining <= 3
              ? "bg-destructive/10 text-destructive animate-pulse"
              : trialDaysRemaining <= 7
                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                : "bg-accent/10 text-accent"
          }`} title={`Trial expira em ${trialDaysRemaining} dias`}>
            <Clock size={12} />
            <span className="hidden sm:inline">{trialDaysRemaining}d restantes</span>
            <span className="sm:hidden">{trialDaysRemaining}d</span>
          </div>
        )}
        <button
          onClick={() => navigate("/ai-assistant")}
          className="hidden sm:flex p-2 rounded-lg hover:bg-accent/10 transition-colors"
          aria-label="Assistente IA"
          title="Assistente IA"
        >
          <span aria-hidden className="text-muted-foreground hover:text-foreground transition-colors" style={{ display: "inline-block", width: 18, height: 18, backgroundColor: "currentColor", WebkitMaskImage: `url(${aiAssistantIcon})`, maskImage: `url(${aiAssistantIcon})`, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskSize: "contain", maskSize: "contain" }} />
        </button>
        <button
          onClick={() => navigate("/support-chat")}
          className="hidden sm:flex p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          aria-label="Chat de suporte"
          title="Suporte"
        >
          <Headphones size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
        </button>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === "dark" ? (
            <Sun size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          ) : (
            <Moon size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          )}
        </button>

        {/* Notification bell with dropdown */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
            title="Notificações"
          >
            <Bell size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-0.5 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 max-h-[400px] rounded-xl border border-border bg-background shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={() => { markAllAsSeen(); setNotifOpen(false); }}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Marcar todas como lidas
                  </button>
                )}
              </div>

              {/* Summary badges */}
              {unreadCount > 0 && (
                <div className="flex gap-2 px-4 py-2 border-b border-border/50">
                  {unreadPayment > 0 && (
                    <button
                      onClick={() => { navigate("/payment-chat"); setNotifOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                    >
                      <CreditCard size={12} className="text-primary" />
                      <span className="text-[11px] font-medium text-primary">{unreadPayment} pagamento</span>
                    </button>
                  )}
                  {unreadSupport > 0 && (
                    <button
                      onClick={() => { navigate("/support-chat"); setNotifOpen(false); }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors"
                    >
                      <MessageSquare size={12} className="text-accent" />
                      <span className="text-[11px] font-medium text-accent">{unreadSupport} suporte</span>
                    </button>
                  )}
                </div>
              )}

              {/* Messages list */}
              <div className="overflow-y-auto max-h-[280px]">
                {recentMessages.length > 0 ? (
                  recentMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => {
                        navigate(msg.chat_type === "payment" ? "/payment-chat" : "/support-chat");
                        setNotifOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          msg.chat_type === "payment" ? "bg-primary/10" : "bg-accent/10"
                        }`}>
                          {msg.chat_type === "payment" ? (
                            <CreditCard size={14} className="text-primary" />
                          ) : (
                            <MessageSquare size={14} className="text-accent" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {msg.sender_name || "Suporte"}
                            </p>
                            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {msg.message || "📎 Arquivo enviado"}
                          </p>
                          <span className={`inline-block mt-1 text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            msg.chat_type === "payment"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/10 text-accent"
                          }`}>
                            {msg.chat_type === "payment" ? "Pagamento" : "Suporte"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Bell size={24} className="text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhuma notificação</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {professional?.avatar_url ? (
          <img src={professional.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-lg stat-glow">
            {(professional?.name || "U")[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
    </>
  );
};

export default TopBar;
