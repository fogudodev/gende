import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard,
  Scissors,
  Users,
  CalendarDays,
  MessageCircle,
  Settings,
  CreditCard,
  Globe,
  BarChart3,
  LogOut,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import logo from "@/assets/logo-circle.png";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarDays, label: "Agendamentos", path: "/bookings" },
  { icon: Scissors, label: "Serviços", path: "/services" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: MessageCircle, label: "WhatsApp", path: "/automations" },
  { icon: CreditCard, label: "Financeiro", path: "/finance" },
  { icon: Globe, label: "Página Pública", path: "/public-page" },
  { icon: BarChart3, label: "Relatórios", path: "/reports" },
  { icon: Settings, label: "Configurações", path: "/settings" },
];

// Bottom nav items for mobile (4 items)
const mobileNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarDays, label: "Agenda", path: "/bookings" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: CreditCard, label: "Financeiro", path: "/finance" },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar = ({ mobileOpen, setMobileOpen }: SidebarProps) => {
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex items-center justify-around h-16 md:hidden safe-area-bottom">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer - slides from left */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-overlay-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-card/95 backdrop-blur-xl border-r border-border p-4 flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Glow" className="w-8 h-8 rounded-lg" />
                <span className="font-bold text-foreground">glow</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <item.icon size={18} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              {isAdmin && (
                <>
                  <div className="my-2 border-t border-border" />
                  <Link
                    to="/admin"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      location.pathname === "/admin"
                        ? "bg-accent/10 text-accent"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <ShieldCheck size={18} />
                    <span className="text-sm font-medium">Admin Master</span>
                  </Link>
                </>
              )}
            </nav>
            <button
              onClick={async () => { await signOut(); navigate("/auth"); }}
              className="flex items-center gap-3 px-3 py-2.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm">Sair</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex glass-sidebar fixed left-0 top-0 h-screen z-50 flex-col transition-all duration-300 ${
          expanded ? "w-[240px]" : "w-[72px]"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
      >
        <div className="flex items-center gap-3 px-4 h-[64px] border-b border-sidebar-border">
          <img src={logo} alt="Glow" className="w-9 h-9 rounded-xl" />
          {expanded && (
            <span className="text-lg font-bold text-sidebar-foreground tracking-tight">glow</span>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"} />
                {expanded && <span className="text-sm font-medium">{item.label}</span>}
                {isActive && expanded && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-sidebar-border" />
              <Link
                to="/admin"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                  location.pathname === "/admin"
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
              >
                <ShieldCheck size={18} className={location.pathname === "/admin" ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"} />
                {expanded && <span className="text-sm font-medium">Admin Master</span>}
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={async () => { await signOut(); navigate("/auth"); }}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors rounded-lg hover:bg-sidebar-accent/50"
          >
            <LogOut size={18} />
            {expanded && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
