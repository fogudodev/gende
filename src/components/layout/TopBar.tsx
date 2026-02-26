import { Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const TopBar = ({ title, subtitle }: TopBarProps) => {
  return (
    <header className="h-14 md:h-[64px] border-b border-border px-4 md:px-6 flex items-center justify-between bg-background/80 backdrop-blur-xl sticky top-0 z-40">
      <div>
        <h1 className="text-base md:text-lg font-bold text-foreground font-display">{title}</h1>
        {subtitle && (
          <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{subtitle}</p>
        )}
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
        <button className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <Bell size={16} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        </button>
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-lg stat-glow">
          A
        </div>
      </div>
    </header>
  );
};

export default TopBar;
