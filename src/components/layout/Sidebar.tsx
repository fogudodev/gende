import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useProfessional } from "@/hooks/useProfessional";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import {
  LayoutDashboard,
  Scissors,
  Users,
  MessageCircle,
  Settings,
  CreditCard,
  Globe,
  BarChart3,
  LogOut,
  ShieldCheck,
  X,
  UserPlus,
  Package,
  Ticket,
  QrCode,
  Star,
  FileBarChart,
  Activity,
  Megaphone,
  Lock,
  Shield,
  Wallet,
  Headphones,
  Bot,
  ChevronDown,
  MessageSquare,
  Send,
} from "lucide-react";
import logo from "@/assets/logo-circle.png";
import calendarIcon from "@/assets/icon-calendar.png";
import dashboardIcon from "@/assets/icon-dashboard.png";
import scissorsIcon from "@/assets/icon-scissors.png";
import clientsIcon from "@/assets/icon-clients.png";
import teamIcon from "@/assets/icon-team.png";
import commissionIcon from "@/assets/icon-commission.png";
import performanceIcon from "@/assets/icon-performance.png";
import whatsappIcon from "@/assets/icon-whatsapp.png";
import automationsIcon from "@/assets/icon-automations.png";

// Wrapper component for custom icons
const CalendarIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={calendarIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const DashboardIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={dashboardIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const ScissorsIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={scissorsIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const ClientsIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={clientsIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const TeamIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={teamIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const CommissionIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={commissionIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const PerformanceIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={performanceIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const WhatsAppIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={whatsappIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);

const AutomationsIcon = ({ size = 18, className }: { size?: number; className?: string }) => (
  <img src={automationsIcon} alt="" width={size} height={size} className={`inline-block brightness-0 invert opacity-40 ${className || ''}`} />
);
import UpgradeModal from "./UpgradeModal";
import type { FeatureKey } from "@/lib/stripe-plans";

interface NavItem {
  icon: any;
  label: string;
  path: string;
  featureKey: FeatureKey;
}

interface NavGroup {
  type: "group";
  icon: any;
  label: string;
  featureKey: FeatureKey;
  children: NavItem[];
}

type NavEntry = NavItem & { type?: "item" } | NavGroup;

const standaloneItems: NavItem[] = [
  { icon: DashboardIcon, label: "Dashboard", path: "/", featureKey: "dashboard" },
  { icon: CalendarIcon, label: "Agendamentos", path: "/bookings", featureKey: "bookings" },
  { icon: ScissorsIcon, label: "Serviços", path: "/services", featureKey: "services" },
  { icon: ClientsIcon, label: "Clientes", path: "/clients", featureKey: "clients" },
];

const whatsappGroup: NavGroup = {
  type: "group",
  icon: WhatsAppIcon,
  label: "WhatsApp",
  featureKey: "automations",
  children: [
    { icon: AutomationsIcon, label: "Automações", path: "/automations", featureKey: "automations" },
    { icon: Megaphone, label: "Campanhas", path: "/campaigns", featureKey: "campaigns" },
  ],
};

const communicationGroup: NavGroup = {
  type: "group",
  icon: MessageSquare,
  label: "Comunicação",
  featureKey: "settings",
  children: [
    { icon: Wallet, label: "Chat Pagamento", path: "/payment-chat", featureKey: "settings" },
    { icon: Headphones, label: "Chat Suporte", path: "/support-chat", featureKey: "settings" },
    { icon: Bot, label: "Assistente IA", path: "/ai-assistant", featureKey: "settings" },
  ],
};

const afterGroupItems: NavItem[] = [
  { icon: CreditCard, label: "Financeiro", path: "/finance", featureKey: "finance" },
  { icon: Globe, label: "Página Pública", path: "/public-page", featureKey: "public-page" },
  { icon: Package, label: "Produtos", path: "/products", featureKey: "products" },
  { icon: Ticket, label: "Cupons", path: "/coupons", featureKey: "coupons" },
  { icon: BarChart3, label: "Relatórios", path: "/reports", featureKey: "reports" },
  { icon: Star, label: "Avaliações", path: "/reviews", featureKey: "reviews" },
  { icon: Settings, label: "Configurações", path: "/settings", featureKey: "settings" },
];

const salonOnlyItems: NavItem[] = [
  { icon: TeamIcon, label: "Equipe", path: "/team", featureKey: "team" },
  { icon: CommissionIcon, label: "Comissões", path: "/commission-report", featureKey: "commission-report" },
  { icon: PerformanceIcon, label: "Desempenho", path: "/team-performance", featureKey: "team-performance" },
];

const mobileNavItems = [
  { icon: DashboardIcon, label: "Dashboard", path: "/" },
  { icon: CalendarIcon, label: "Agenda", path: "/bookings" },
  { icon: ClientsIcon, label: "Clientes", path: "/clients" },
  { icon: CreditCard, label: "Financeiro", path: "/finance" },
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
  const { isLocked, requiredPlan, currentPlan } = useFeatureAccess();

  const isSalon = professional?.account_type === "salon";
  const displayName = professional?.business_name || professional?.name || "Gende";
  const displayLogo = professional?.logo_url || logo;
  const planLabel = currentPlan === "enterprise" ? "Enterprise" : currentPlan === "essencial" ? "Essencial" : "";
  const buildNavEntries = (): NavEntry[] => {
    const entries: NavEntry[] = [...standaloneItems];
    if (isSalon) entries.push(...salonOnlyItems);
    entries.push(whatsappGroup, communicationGroup, ...afterGroupItems);
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

  const renderItem = (item: NavItem, opts: { onNav?: () => void; mobile?: boolean }) => {
    const isActive = location.pathname === item.path;
    const locked = isLocked(item.featureKey);

    if (locked) {
      return (
        <button
          key={item.path}
          onClick={() => {
            opts.onNav?.();
            handleLockedClick(item.label, item.featureKey);
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
            opts.mobile
              ? "text-muted-foreground/50"
              : "text-sidebar-foreground/30 hover:bg-sidebar-accent/20"
          } transition-all duration-200 group`}
        >
          <item.icon size={18} className={opts.mobile ? undefined : "text-sidebar-foreground/25"} />
          <span className="text-sm font-medium">{item.label}</span>
          <Lock size={11} className="ml-auto opacity-40" />
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
          <item.icon size={18} />
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
      );
    }

    return (
      <Link
        key={item.path}
        to={item.path}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group ${
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
  };

  const renderGroup = (group: NavGroup, opts: { onNav?: () => void; mobile?: boolean }) => {
    const groupActive = isGroupActive(group);
    const isOpen = openGroups[group.label] ?? groupActive;
    const locked = isLocked(group.featureKey);

    if (locked && !opts.mobile && !expanded) {
      return (
        <button
          key={group.label}
          onClick={() => handleLockedClick(group.label, group.featureKey)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-sidebar-foreground/30 cursor-pointer hover:bg-sidebar-accent/20 transition-all duration-200"
        >
          <group.icon size={18} className="text-sidebar-foreground/25" />
        </button>
      );
    }

    return (
      <div key={group.label}>
        <button
          onClick={() => toggleGroup(group.label)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
            groupActive
              ? opts.mobile
                ? "text-accent"
                : "text-sidebar-primary"
              : opts.mobile
                ? "text-muted-foreground hover:text-foreground hover:bg-secondary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <group.icon
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

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
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
