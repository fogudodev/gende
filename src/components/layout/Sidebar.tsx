import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useProfessional } from "@/hooks/useProfessional";
import { useReceptionEmployee } from "@/hooks/useReceptionEmployee";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useIsFeatureEnabled } from "@/hooks/useFeatureFlags";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Scissors,
  Users,
  UserPlus,
  MessageCircle,
  Megaphone,
  MessageSquare,
  Wallet,
  Headphones,
  Bot,
  CreditCard,
  Globe,
  Package,
  Ticket,
  BarChart3,
  Star,
  Settings,
  BookOpen,
  Activity,
  LogOut,
  ShieldCheck,
  Shield,
  X,
  Lock,
  ChevronDown,
  Zap,
  type LucideIcon,
} from "lucide-react";
import logo from "@/assets/logo-circle.png";
import UpgradeModal from "./UpgradeModal";
import type { FeatureKey } from "@/lib/stripe-plans";

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  featureKey: FeatureKey;
}

interface NavGroup {
  type: "group";
  icon: LucideIcon;
  label: string;
  featureKey: FeatureKey;
  children: NavItem[];
}

type NavEntry = NavItem & { type?: "item" } | NavGroup;

const standaloneItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", featureKey: "dashboard" },
  { icon: CalendarDays, label: "Agendamentos", path: "/bookings", featureKey: "bookings" },
  { icon: Clock, label: "Lista de Espera", path: "/waitlist", featureKey: "bookings" },
  { icon: Scissors, label: "Serviços", path: "/services", featureKey: "services" },
  { icon: Users, label: "Clientes", path: "/clients", featureKey: "clients" },
];

const whatsappGroup: NavGroup = {
  type: "group",
  icon: MessageCircle,
  label: "WhatsApp",
  featureKey: "automations",
  children: [
    { icon: Zap, label: "Automações", path: "/automations", featureKey: "automations" },
    { icon: Megaphone, label: "Campanhas", path: "/campaigns", featureKey: "campaigns" },
  ],
};

const communicationGroup: NavGroup = {
  type: "group",
  icon: MessageSquare,
  label: "Comunicação",
  featureKey: "dashboard",
  children: [
    { icon: Wallet, label: "Chat Pagamento", path: "/payment-chat", featureKey: "payment-chat" },
    { icon: Headphones, label: "Chat Suporte", path: "/support-chat", featureKey: "support-chat" },
    { icon: Bot, label: "Assistente IA", path: "/ai-assistant", featureKey: "ai-assistant" },
  ],
};

const afterGroupItems: NavItem[] = [
  { icon: CreditCard, label: "Financeiro", path: "/finance", featureKey: "finance" },
  { icon: Globe, label: "Página Pública", path: "/public-page", featureKey: "public-page" },
  { icon: Package, label: "Produtos", path: "/products", featureKey: "products" },
  { icon: Package, label: "Pacotes", path: "/service-packages", featureKey: "products" },
  { icon: Ticket, label: "Cupons", path: "/coupons", featureKey: "coupons" },
  { icon: BarChart3, label: "Relatórios", path: "/reports", featureKey: "reports" },
  { icon: Star, label: "Avaliações", path: "/reviews", featureKey: "reviews" },
  { icon: Settings, label: "Configurações", path: "/settings", featureKey: "settings" },
  { icon: BookOpen, label: "Central de Ajuda", path: "/instructions", featureKey: "dashboard" },
];

const salonOnlyItems: NavItem[] = [
  { icon: UserPlus, label: "Equipe", path: "/team", featureKey: "team" },
  { icon: Activity, label: "Comissões", path: "/commission-report", featureKey: "commission-report" },
  { icon: BarChart3, label: "Desempenho", path: "/team-performance", featureKey: "team-performance" },
];

const cashRegisterItem: NavItem = { icon: Wallet, label: "Caixa", path: "/cash-register", featureKey: "finance" };

const receptionNavItems: NavItem[] = [
  { icon: CalendarDays, label: "Agendamentos", path: "/bookings", featureKey: "bookings" },
  { icon: Users, label: "Clientes", path: "/clients", featureKey: "clients" },
  { icon: Wallet, label: "Caixa", path: "/cash-register", featureKey: "finance" },
  { icon: Zap, label: "Conversas WhatsApp", path: "/automations", featureKey: "automations" },
];

const mobileNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CalendarDays, label: "Agenda", path: "/bookings" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: CreditCard, label: "Financeiro", path: "/finance" },
];

const receptionMobileNavItems = [
  { icon: CalendarDays, label: "Agenda", path: "/bookings" },
  { icon: Users, label: "Clientes", path: "/clients" },
  { icon: Wallet, label: "Caixa", path: "/cash-register" },
  { icon: Zap, label: "WhatsApp", path: "/automations" },
];

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const Sidebar = ({ mobileOpen, setMobileOpen }: SidebarProps) => {
  const [expanded, setExpanded] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<{ name: string; featureKey: FeatureKey } | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { data: professional } = useProfessional();
  const { data: reception } = useReceptionEmployee();
  const { isLocked, requiredPlan, currentPlan } = useFeatureAccess();

  const { enabled: servicePackagesEnabled } = useIsFeatureEnabled("service_packages");
  const isReception = !!reception && !professional;
  const isSalon = professional?.account_type === "salon";
  const displayName = isReception ? reception.name : (professional?.business_name || professional?.name || "Gende");
  const displayLogo = isReception ? logo : (professional?.logo_url || logo);
  const planLabel = currentPlan === "enterprise" ? "Enterprise" : currentPlan === "essencial" ? "Essencial" : "";
  
  const buildNavEntries = (): NavEntry[] => {
    if (isReception) {
      return receptionNavItems;
    }
    const entries: NavEntry[] = [...standaloneItems];
    if (isSalon) {
      entries.push(...salonOnlyItems);
      entries.push(cashRegisterItem);
    }
    const filteredAfterGroupItems = afterGroupItems.filter((item) => {
      if (item.path === "/service-packages" && !servicePackagesEnabled) return false;
      return true;
    });
    entries.push(whatsappGroup, communicationGroup, ...filteredAfterGroupItems);
    return entries;
  };

  const navEntries = buildNavEntries();

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isGroupActive = (group: NavGroup) =>
    group.children.some((c) => location.pathname === c.path);

  const handleLockedClick = (label: string, featureKey: FeatureKey) => {
    setUpgradeFeature({ name: label, featureKey });
    setUpgradeOpen(true);
  };

  const iconClass = (isActive: boolean, mobile?: boolean) => {
    if (mobile) {
      return `flex-shrink-0 ${isActive ? "text-accent" : "text-muted-foreground"}`;
    }
    return `flex-shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"}`;
  };

  const renderItem = (item: NavItem, opts: { onNav?: () => void; mobile?: boolean }) => {
    const isActive = location.pathname === item.path;
    const locked = isLocked(item.featureKey);
    const Icon = item.icon;

    if (locked) {
      return (
        <button
          key={item.path}
          onClick={() => {
            opts.onNav?.();
            handleLockedClick(item.label, item.featureKey);
          }}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg cursor-pointer ${
            opts.mobile
              ? "text-muted-foreground/50"
              : "text-sidebar-foreground/30 hover:bg-sidebar-accent/20"
          } transition-all duration-200 group overflow-hidden`}
        >
          <Icon size={18} className={`flex-shrink-0 ${opts.mobile ? "" : "text-sidebar-foreground/25"}`} />
          {(opts.mobile || expanded) && <span className="text-sm font-medium truncate">{item.label}</span>}
          {(opts.mobile || expanded) && <Lock size={11} className="ml-auto opacity-40 flex-shrink-0" />}
        </button>
      );
    }

    if (opts.mobile) {
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={opts.onNav}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? "bg-accent/10 text-accent"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Icon size={18} className={iconClass(isActive, true)} />
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 group overflow-hidden ${
          isActive
            ? "bg-sidebar-accent text-sidebar-primary"
            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`}
      >
        <Icon size={18} className={iconClass(isActive, false)} />
        {expanded && <span className="text-sm font-medium truncate">{item.label}</span>}
        {isActive && expanded && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary flex-shrink-0" />}
      </Link>
    );
  };

  const renderGroup = (group: NavGroup, opts: { onNav?: () => void; mobile?: boolean }) => {
    const groupActive = isGroupActive(group);
    const isOpen = openGroups[group.label] ?? groupActive;
    const locked = isLocked(group.featureKey);
    const GroupIcon = group.icon;

    if (locked && !opts.mobile && !expanded) {
      return (
        <button
          key={group.label}
          onClick={() => handleLockedClick(group.label, group.featureKey)}
          className="flex items-center gap-3 px-3 py-1.5 rounded-lg w-full text-sidebar-foreground/30 cursor-pointer hover:bg-sidebar-accent/20 transition-all duration-200 overflow-hidden"
        >
          <GroupIcon size={18} className="text-sidebar-foreground/25" />
        </button>
      );
    }

    return (
      <div key={group.label}>
        <button
          onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all duration-200 group overflow-hidden ${
            groupActive
              ? opts.mobile
                ? "text-accent"
                : "text-sidebar-primary"
              : opts.mobile
                ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <GroupIcon
            size={18}
            className={
              groupActive
                ? opts.mobile ? "text-accent" : "text-sidebar-primary"
                : opts.mobile ? "text-muted-foreground" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
            }
          />
          {(opts.mobile || expanded) && (
            <>
              <span className="text-sm font-medium">{group.label}</span>
              <ChevronDown
                size={14}
                className={`ml-auto transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </>
          )}
        </button>
        {isOpen && (opts.mobile || expanded) && (
          <div className={`mt-0.5 space-y-0.5 ${opts.mobile ? "ml-4 pl-3 border-l border-border" : "ml-4 pl-3 border-l border-sidebar-border"}`}>
            {group.children.map((child) => renderItem(child, opts))}
          </div>
        )}
      </div>
    );
  };

  const renderEntry = (entry: NavEntry, opts: { onNav?: () => void; mobile?: boolean }) => {
    if ("type" in entry && entry.type === "group") {
      return renderGroup(entry as NavGroup, opts);
    }
    return renderItem(entry as NavItem, opts);
  };

  return (
    <>
      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        requiredPlan={upgradeFeature ? requiredPlan(upgradeFeature.featureKey) : null}
        featureName={upgradeFeature?.name}
      />

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 flex items-center justify-around h-16 md:hidden safe-area-bottom">
        {(isReception ? receptionMobileNavItems : mobileNavItems).map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-foreground/50 backdrop-blur-sm animate-overlay-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 bg-card/95 backdrop-blur-xl border-r border-border p-4 flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 min-w-0">
                <img src={displayLogo} alt={displayName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                <span className="font-bold text-foreground text-sm truncate">
                  {displayName}{planLabel ? ` | ${planLabel}` : ""}
                </span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-0.5 overflow-y-auto">
              {navEntries.map((entry) => renderEntry(entry, { onNav: () => setMobileOpen(false), mobile: true }))}
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
        <div className="flex items-center gap-3 px-4 h-[64px] border-b border-sidebar-border overflow-hidden">
          <img src={displayLogo} alt={displayName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
          {expanded && (
            <div className="min-w-0">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight block truncate">
                {displayName}{planLabel ? ` | ${planLabel}` : ""}
              </span>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto scrollbar-none">
          {navEntries.map((entry) => renderEntry(entry, {}))}

          {isAdmin && (
            <>
              <div className="my-2 border-t border-sidebar-border" />
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              >
                <Shield size={18} className="text-sidebar-foreground/50 group-hover:text-sidebar-foreground" />
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
