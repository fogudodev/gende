import { Bell, Search } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

const TopBar = ({ title, subtitle }: TopBarProps) => {
  return (
    <header className="h-[72px] border-b border-border px-8 flex items-center justify-between bg-card/50 backdrop-blur-md sticky top-0 z-40">
      <div>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            className="pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 w-[240px] transition-all"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors">
          <Bell size={18} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
        </button>
        <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
          G
        </div>
      </div>
    </header>
  );
};

export default TopBar;
