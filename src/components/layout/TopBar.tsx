import { Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const TopBar = ({ title, subtitle }: TopBarProps) => {
  return (
    <header className="h-14 md:h-[64px] border-b border-border px-4 md:px-6 flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-40">
      <div>
        <h1 className="text-base md:text-lg font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 w-[180px] md:w-[220px] transition-all"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell size={16} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent" />
        </button>
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
          G
        </div>
      </div>
    </header>
  );
};

export default TopBar;
