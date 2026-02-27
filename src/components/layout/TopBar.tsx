import { Bell, Search, Sun, Moon, Menu, Crown, Headphones, Sparkles, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { useProfessional } from "@/hooks/useProfessional";
import { useState } from "react";
import PlanRenewalModal from "./PlanRenewalModal";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

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
  const { unreadPayment, unreadSupport } = useUnreadMessages();
  const navigate = useNavigate();

  return (
    <>
    <PlanRenewalModal open={renewalOpen} onOpenChange={setRenewalOpen} />
    <header className="h-14 md:h-[64px] border-b border-border px-4 md:px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-secondary/50 transition-colors md:hidden"
          aria-label="Abrir menu"
        >
          <Menu size={20} className="text-foreground" />
        </button>
        <div>
          <h1 className="text-base md:text-lg font-bold text-foreground font-display">{title}</h1>
          {subtitle && (
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-secondary/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 w-[160px] md:w-[200px] transition-all"
          />
        </div>
        <button
          onClick={() => setRenewalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
          title="Gerenciar plano"
        >
          <Crown size={14} />
          <span className="hidden sm:inline">
            {currentPlan === "none" ? "Assinar" : currentPlan === "essencial" ? "Essencial" : "Enterprise"}
          </span>
        </button>
        <button
          onClick={() => navigate("/ai-assistant")}
          className="p-2 rounded-lg hover:bg-accent/10 transition-colors"
          aria-label="Assistente IA"
          title="Assistente IA"
        >
          <Sparkles size={16} className="text-accent" />
        </button>
        <button
          onClick={() => navigate("/support-chat")}
          className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          aria-label="Chat de suporte"
          title="Suporte"
        >
          <Headphones size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          {unreadSupport > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-0.5 animate-pulse">
              {unreadSupport > 99 ? "99+" : unreadSupport}
            </span>
          )}
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
        <button
          onClick={() => navigate("/payment-chat")}
          className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors"
          title="Chat de Pagamento"
        >
          <Wallet size={16} className="text-muted-foreground hover:text-foreground transition-colors" />
          {unreadPayment > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-0.5 animate-pulse">
              {unreadPayment > 99 ? "99+" : unreadPayment}
            </span>
          )}
        </button>
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
