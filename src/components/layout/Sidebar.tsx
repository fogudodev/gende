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
import campaignsIcon from "@/assets/icon-campaigns.png";
import communicationIcon from "@/assets/icon-communication.png";
import paymentChatIcon from "@/assets/icon-payment-chat.png";
import supportChatIcon from "@/assets/icon-support-chat.png";
import aiIcon from "@/assets/icon-ai.png";
import financeIcon from "@/assets/icon-finance.png";
import publicPageIcon from "@/assets/icon-public-page.png";
import productsIcon from "@/assets/icon-products.png";
import couponsIcon from "@/assets/icon-coupons.png";
import reportsIcon from "@/assets/icon-reports.png";
import reviewsIcon from "@/assets/icon-reviews.png";
import settingsIcon from "@/assets/icon-settings.png";

// Wrapper component for custom icons
// Sidebar always has dark bg, so icons should always be inverted (white) in sidebar
// But in mobile drawer & bottom nav, icons follow theme
const SidebarIcon = ({ src, size = 18, className, active }: { src: string; size?: number; className?: string; active?: boolean }) => (
  <img src={src} alt="" width={size} height={size} className={`inline-block brightness-0 invert ${active ? 'opacity-90' : 'opacity-40'} ${className || ''}`} />
);

const ThemeAwareIcon = ({ src, size = 18, className, active }: { src: string; size?: number; className?: string; active?: boolean }) => (
  <img src={src} alt="" width={size} height={size} className={`inline-block brightness-0 ${active ? 'opacity-100 dark:opacity-90' : 'opacity-40'} dark:invert ${className || ''}`} />
);

const CalendarIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={calendarIcon} size={size} className={className} active={active} /> : <SidebarIcon src={calendarIcon} size={size} className={className} active={active} />;

const DashboardIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={dashboardIcon} size={size} className={className} active={active} /> : <SidebarIcon src={dashboardIcon} size={size} className={className} active={active} />;

const ScissorsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={scissorsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={scissorsIcon} size={size} className={className} active={active} />;

const ClientsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={clientsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={clientsIcon} size={size} className={className} active={active} />;

const TeamIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={teamIcon} size={size} className={className} active={active} /> : <SidebarIcon src={teamIcon} size={size} className={className} active={active} />;

const CommissionIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={commissionIcon} size={size} className={className} active={active} /> : <SidebarIcon src={commissionIcon} size={size} className={className} active={active} />;

const PerformanceIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={performanceIcon} size={size} className={className} active={active} /> : <SidebarIcon src={performanceIcon} size={size} className={className} active={active} />;

const WhatsAppIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={whatsappIcon} size={size} className={className} active={active} /> : <SidebarIcon src={whatsappIcon} size={size} className={className} active={active} />;

const AutomationsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={automationsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={automationsIcon} size={size} className={className} active={active} />;

const CampaignsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={campaignsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={campaignsIcon} size={size} className={className} active={active} />;

const CommunicationIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={communicationIcon} size={size} className={className} active={active} /> : <SidebarIcon src={communicationIcon} size={size} className={className} active={active} />;

const PaymentChatIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={paymentChatIcon} size={size} className={className} active={active} /> : <SidebarIcon src={paymentChatIcon} size={size} className={className} active={active} />;

const SupportChatIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={supportChatIcon} size={size} className={className} active={active} /> : <SidebarIcon src={supportChatIcon} size={size} className={className} active={active} />;

const AIIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={aiIcon} size={size} className={className} active={active} /> : <SidebarIcon src={aiIcon} size={size} className={className} active={active} />;

const FinanceIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={financeIcon} size={size} className={className} active={active} /> : <SidebarIcon src={financeIcon} size={size} className={className} active={active} />;

const PublicPageIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={publicPageIcon} size={size} className={className} active={active} /> : <SidebarIcon src={publicPageIcon} size={size} className={className} active={active} />;

const ProductsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={productsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={productsIcon} size={size} className={className} active={active} />;

const CouponsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={couponsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={couponsIcon} size={size} className={className} active={active} />;

const ReportsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={reportsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={reportsIcon} size={size} className={className} active={active} />;

const ReviewsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={reviewsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={reviewsIcon} size={size} className={className} active={active} />;

const SettingsIcon = ({ size = 18, className, mobile, active }: { size?: number; className?: string; mobile?: boolean; active?: boolean }) => 
  mobile ? <ThemeAwareIcon src={settingsIcon} size={size} className={className} active={active} /> : <SidebarIcon src={settingsIcon} size={size} className={className} active={active} />;
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
    { icon: CampaignsIcon, label: "Campanhas", path: "/campaigns", featureKey: "campaigns" },
  ],
};

const communicationGroup: NavGroup = {
  type: "group",
  icon: CommunicationIcon,
  label: "Comunicação",
  featureKey: "settings",
  children: [
    { icon: PaymentChatIcon, label: "Chat Pagamento", path: "/payment-chat", featureKey: "settings" },
    { icon: SupportChatIcon, label: "Chat Suporte", path: "/support-chat", featureKey: "settings" },
    { icon: AIIcon, label: "Assistente IA", path: "/ai-assistant", featureKey: "settings" },
  ],
};

const afterGroupItems: NavItem[] = [
  { icon: FinanceIcon, label: "Financeiro", path: "/finance", featureKey: "finance" },
  { icon: PublicPageIcon, label: "Página Pública", path: "/public-page", featureKey: "public-page" },
  { icon: ProductsIcon, label: "Produtos", path: "/products", featureKey: "products" },
  { icon: CouponsIcon, label: "Cupons", path: "/coupons", featureKey: "coupons" },
  { icon: ReportsIcon, label: "Relatórios", path: "/reports", featureKey: "reports" },
  { icon: ReviewsIcon, label: "Avaliações", path: "/reviews", featureKey: "reviews" },
  { icon: SettingsIcon, label: "Configurações", path: "/settings", featureKey: "settings" },
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
  { icon: FinanceIcon, label: "Financeiro", path: "/finance" },
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
          <item.icon size={18} mobile={opts.mobile} className={opts.mobile ? undefined : "text-sidebar-foreground/25"} />
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
          <item.icon size={18} mobile={true} active={isActive} />
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
        <item.icon size={18} mobile={opts.mobile} active={isActive} className={isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"} />
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
          <group.icon size={18} mobile={opts.mobile} className="text-sidebar-foreground/25" />
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
            mobile={opts.mobile}
            active={groupActive}
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
              <item.icon size={20} mobile={true} />
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
