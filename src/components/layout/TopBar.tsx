import { Bell, Search, Sun, Moon, Menu } from "lucide-react";
import { useTheme } from "next-themes";
import { useProfessional } from "@/hooks/useProfessional";

interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

const TopBar = ({ title, subtitle, onMenuClick }: TopBarProps) => {
  const { theme, setTheme } = useTheme();
  const { data: professional } = useProfessional();

  return (
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
        <button className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <Bell size={16} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
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
  );
};

export default TopBar;
