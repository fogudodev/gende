import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CreditCard, Clock, Globe, Shield, MessageSquare,
  ArrowLeft, Save, Loader2, CheckCircle2, QrCode, Power,
  Palette, Eye, EyeOff, Crown, AlertTriangle,
} from "lucide-react";
import { useProfessional } from "@/hooks/useProfessional";
import { useWorkingHours, getDayName, useUpsertWorkingHours } from "@/hooks/useWorkingHours";
import { useSubscription } from "@/hooks/useSubscription";
import { useWhatsAppInstance, useWhatsAppAutomations, useToggleAutomation } from "@/hooks/useWhatsApp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "profile" | "hours" | "subscription" | "whatsapp" | "security";

const TRIGGER_LABELS: Record<string, string> = {
  booking_created: "Agendamento criado",
  reminder_24h: "Lembrete 24h antes",
  reminder_3h: "Lembrete 3h antes",
  post_service: "Pós-atendimento",
  reactivation_30d: "Reativação 30 dias",
};

const COLOR_PRESETS = [
  "#C4922A", "#E67E22", "#E74C3C", "#9B59B6",
  "#3498DB", "#1ABC9C", "#2ECC71", "#34495E",
  "#F39C12", "#D35400", "#8E44AD", "#2980B9",
];

const Settings = () => {
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const sections = [
    { id: "profile" as Section, icon: User, title: "Perfil e Página Pública", description: "Dados pessoais, slug, cores e logo" },
    { id: "hours" as Section, icon: Clock, title: "Horários de Trabalho", description: "Defina seus dias e horários de atendimento" },
    { id: "subscription" as Section, icon: CreditCard, title: "Assinatura", description: "Plano atual e gerenciamento" },
    { id: "whatsapp" as Section, icon: MessageSquare, title: "Automação WhatsApp", description: "QR Code, instância e automações" },
    { id: "security" as Section, icon: Shield, title: "Segurança", description: "Alteração de senha" },
  ];

  return (
    <DashboardLayout title="Configurações" subtitle="Gerencie sua conta">
      <div className="max-w-3xl">
        <AnimatePresence mode="wait">
          {!activeSection ? (
            <motion.div
              key="menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {sections.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setActiveSection(s.id)}
                  className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover-lift group text-left"
                >
                  <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-accent/10 transition-colors">
                    <s.icon size={20} className="text-muted-foreground group-hover:text-accent transition-colors" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.description}</p>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <button
                onClick={() => setActiveSection(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft size={14} /> Voltar
              </button>

              {activeSection === "profile" && <ProfileSection />}
              {activeSection === "hours" && <WorkingHoursSection />}
              {activeSection === "subscription" && <SubscriptionSection />}
              {activeSection === "whatsapp" && <WhatsAppSection />}
              {activeSection === "security" && <SecuritySection />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

/* ===================== PROFILE SECTION ===================== */
const ProfileSection = () => {
  const { data: professional, isLoading } = useProfessional();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", business_name: "", email: "", phone: "",
    bio: "", slug: "", primary_color: "#C4922A",
  });

  useEffect(() => {
    if (professional) {
      setForm({
        name: professional.name || "",
        business_name: professional.business_name || "",
        email: professional.email || "",
        phone: professional.phone || "",
        bio: professional.bio || "",
        slug: professional.slug || "",
        primary_color: professional.primary_color || "#C4922A",
      });
    }
  }, [professional]);

  const handleSave = async () => {
    if (!professional) return;
    setSaving(true);

    const slugClean = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);

    const { error } = await supabase
      .from("professionals")
      .update({
        name: form.name.trim(),
        business_name: form.business_name.trim(),
        phone: form.phone.trim(),
        bio: form.bio.trim(),
        slug: slugClean || null,
        primary_color: form.primary_color,
      })
      .eq("id", professional.id);

    if (error) {
      toast.error(error.message.includes("duplicate") ? "Este slug já está em uso" : "Erro ao salvar");
    } else {
      toast.success("Perfil atualizado!");
      qc.invalidateQueries({ queryKey: ["professional"] });
    }
    setSaving(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader icon={User} title="Perfil e Página Pública" />

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Nome" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <FormField label="Nome do negócio" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} />
          <FormField label="Email" value={form.email} disabled />
          <FormField label="Telefone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            maxLength={300}
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all resize-none text-sm"
          />
        </div>
      </div>

      {/* Slug */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-accent" />
          <h3 className="font-semibold text-foreground">URL da Página Pública</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">…/p/</span>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
            placeholder="meu-salao"
            maxLength={50}
            className="flex-1 px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        {form.slug && (
          <p className="text-xs text-muted-foreground">
            Sua página ficará acessível em: <span className="text-accent font-medium">/p/{form.slug}</span>
          </p>
        )}
      </div>

      {/* Color */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-accent" />
          <h3 className="font-semibold text-foreground">Cor Principal</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setForm({ ...form, primary_color: c })}
              className={cn(
                "w-9 h-9 rounded-xl transition-all",
                form.primary_color === c ? "ring-2 ring-offset-2 ring-accent scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="w-9 h-9 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden relative">
            <Palette size={14} className="text-muted-foreground" />
            <input
              type="color"
              value={form.primary_color}
              onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: form.primary_color }} />
          <span className="text-sm text-muted-foreground font-mono">{form.primary_color}</span>
        </div>
      </div>

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
};

/* ===================== WORKING HOURS ===================== */
const DEFAULT_HOURS = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: "09:00",
  end_time: "18:00",
  is_active: i >= 1 && i <= 5,
}));

const WorkingHoursSection = () => {
  const { data: hours, isLoading } = useWorkingHours();
  const upsert = useUpsertWorkingHours();
  const [local, setLocal] = useState(DEFAULT_HOURS);

  useEffect(() => {
    if (hours && hours.length > 0) {
      const merged = DEFAULT_HOURS.map((d) => {
        const found = hours.find((h) => h.day_of_week === d.day_of_week);
        return found ? { day_of_week: found.day_of_week, start_time: found.start_time.slice(0, 5), end_time: found.end_time.slice(0, 5), is_active: found.is_active } : d;
      });
      setLocal(merged);
    }
  }, [hours]);

  const toggle = (day: number) => {
    setLocal((prev) => prev.map((h) => h.day_of_week === day ? { ...h, is_active: !h.is_active } : h));
  };

  const update = (day: number, field: "start_time" | "end_time", value: string) => {
    setLocal((prev) => prev.map((h) => h.day_of_week === day ? { ...h, [field]: value } : h));
  };

  const handleSave = () => {
    upsert.mutate(local, {
      onSuccess: () => toast.success("Horários salvos!"),
      onError: () => toast.error("Erro ao salvar horários"),
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader icon={Clock} title="Horários de Trabalho" />

      <div className="glass-card rounded-2xl p-6 space-y-3">
        {local.map((h) => (
          <div key={h.day_of_week} className="flex items-center gap-3 py-2">
            <button
              onClick={() => toggle(h.day_of_week)}
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all text-xs font-bold shrink-0",
                h.is_active ? "gradient-accent text-accent-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {getDayName(h.day_of_week).slice(0, 3)}
            </button>
            <span className={cn("text-sm w-20 shrink-0", h.is_active ? "text-foreground font-medium" : "text-muted-foreground")}>
              {getDayName(h.day_of_week)}
            </span>
            {h.is_active ? (
              <div className="flex items-center gap-2">
                <input type="time" value={h.start_time} onChange={(e) => update(h.day_of_week, "start_time", e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
                <span className="text-muted-foreground text-xs">até</span>
                <input type="time" value={h.end_time} onChange={(e) => update(h.day_of_week, "end_time", e.target.value)}
                  className="px-2 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Fechado</span>
            )}
          </div>
        ))}
      </div>

      <SaveButton saving={upsert.isPending} onClick={handleSave} />
    </div>
  );
};

/* ===================== SUBSCRIPTION ===================== */
const SubscriptionSection = () => {
  const { data: subscription, isLoading } = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);

  const currentPlan = subscription?.plan_id || "free";

  const handleCheckout = async (priceId: string) => {
    setLoadingCheckout(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao iniciar checkout");
    }
    setLoadingCheckout(null);
  };

  const handlePortal = async () => {
    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast.error("Erro ao abrir portal");
    }
    setLoadingPortal(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader icon={CreditCard} title="Assinatura" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS[keyof typeof STRIPE_PLANS]][]).map(([id, plan]) => {
          const isCurrent = id === currentPlan;
          return (
            <div
              key={id}
              className={cn(
                "glass-card rounded-2xl p-5 space-y-4 transition-all",
                isCurrent && "ring-2 ring-accent"
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">{plan.name}</h3>
                {isCurrent && (
                  <span className="text-[10px] font-bold uppercase bg-accent/10 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Crown size={10} /> Atual
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{plan.price}<span className="text-xs text-muted-foreground font-normal">/mês</span></p>
              <ul className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="text-accent mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && plan.priceId && (
                <button
                  onClick={() => handleCheckout(plan.priceId!)}
                  disabled={loadingCheckout === plan.priceId}
                  className="w-full py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover-lift disabled:opacity-50"
                >
                  {loadingCheckout === plan.priceId ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : "Assinar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {currentPlan !== "free" && (
        <div className="glass-card rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Gerenciar assinatura</p>
            <p className="text-xs text-muted-foreground">Cancelar, trocar forma de pagamento ou upgrade</p>
          </div>
          <button
            onClick={handlePortal}
            disabled={loadingPortal}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {loadingPortal ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gerenciar"}
          </button>
        </div>
      )}
    </div>
  );
};

/* ===================== WHATSAPP ===================== */
const WhatsAppSection = () => {
  const { data: professional } = useProfessional();
  const { data: instance, isLoading, refetch: refetchInstance } = useWhatsAppInstance();
  const { data: automations } = useWhatsAppAutomations();
  const toggleAutomation = useToggleAutomation();
  const [connecting, setConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const handleConnect = async () => {
    if (!professional) return;
    setConnecting(true);
    try {
      const instanceName = `glow_${professional.id.slice(0, 8)}`;
      const { data, error } = await supabase.functions.invoke("whatsapp", {
        body: { action: "create-instance", instanceName, professionalId: professional.id },
      });
      if (error) throw error;

      // Try to get QR code
      const { data: qrData } = await supabase.functions.invoke("whatsapp", {
        body: { action: "get-qrcode", instanceName },
      });
      if (qrData?.base64) {
        setQrCode(qrData.base64);
      } else if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
      }
      refetchInstance();
    } catch {
      toast.error("Erro ao conectar instância");
    }
    setConnecting(false);
  };

  const handleCheckStatus = async () => {
    if (!instance?.instance_name || !professional) return;
    setCheckingStatus(true);
    try {
      const { data } = await supabase.functions.invoke("whatsapp", {
        body: { action: "check-status", instanceName: instance.instance_name, professionalId: professional.id },
      });
      if (data?.instance?.state === "open") {
        toast.success("WhatsApp conectado!");
        setQrCode(null);
      } else {
        toast.info("Ainda não conectado. Escaneie o QR Code.");
      }
      refetchInstance();
    } catch {
      toast.error("Erro ao verificar status");
    }
    setCheckingStatus(false);
  };

  if (isLoading) return <LoadingState />;

  const isConnected = instance?.status === "connected";

  return (
    <div className="space-y-6">
      <SectionHeader icon={MessageSquare} title="Automação WhatsApp" />

      {/* Connection */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-3 h-3 rounded-full", isConnected ? "bg-green-500" : "bg-red-400")} />
            <div>
              <p className="font-semibold text-foreground text-sm">
                {isConnected ? "Conectado" : "Desconectado"}
              </p>
              {instance?.phone_number && (
                <p className="text-xs text-muted-foreground">{instance.phone_number}</p>
              )}
            </div>
          </div>

          {!isConnected && (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover-lift disabled:opacity-50 flex items-center gap-1.5"
            >
              {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><QrCode size={14} /> Conectar</>}
            </button>
          )}
        </div>

        {/* QR Code */}
        {(qrCode || instance?.qr_code) && !isConnected && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <img
                  src={qrCode || instance?.qr_code || ""}
                  alt="QR Code WhatsApp"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Abra o WhatsApp &gt; Dispositivos conectados &gt; Conectar dispositivo
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="px-4 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {checkingStatus ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power size={12} />}
                Verificar conexão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Automations */}
      {automations && automations.length > 0 && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground text-sm">Automações</h3>
          <div className="space-y-3">
            {automations.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{TRIGGER_LABELS[a.trigger_type] || a.trigger_type}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{a.message_template}</p>
                </div>
                <button
                  onClick={() => toggleAutomation.mutate({ id: a.id, is_active: !a.is_active })}
                  className={cn(
                    "w-10 h-6 rounded-full transition-colors relative",
                    a.is_active ? "bg-accent" : "bg-muted"
                  )}
                >
                  <div className={cn(
                    "w-4 h-4 rounded-full bg-white absolute top-1 transition-all",
                    a.is_active ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
            ))}
          </div>

          {!isConnected && (
            <div className="flex items-start gap-2 bg-warning/10 rounded-xl p-3">
              <AlertTriangle size={14} className="text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">Conecte o WhatsApp acima para ativar as automações.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ===================== SECURITY ===================== */
const SecuritySection = () => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader icon={Shield} title="Segurança" />

      <form onSubmit={handleChangePassword} className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Alterar senha</h3>

        <PasswordField
          label="Nova senha"
          value={newPassword}
          onChange={setNewPassword}
          show={showPasswords}
        />
        <PasswordField
          label="Confirmar nova senha"
          value={confirmPassword}
          onChange={setConfirmPassword}
          show={showPasswords}
        />

        <button
          type="button"
          onClick={() => setShowPasswords(!showPasswords)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          {showPasswords ? <EyeOff size={12} /> : <Eye size={12} />}
          {showPasswords ? "Ocultar senhas" : "Mostrar senhas"}
        </button>

        <button
          type="submit"
          disabled={saving || !newPassword || !confirmPassword}
          className="w-full py-3 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover-lift disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Alterar senha</>}
        </button>
      </form>
    </div>
  );
};

/* ===================== SHARED COMPONENTS ===================== */
const SectionHeader = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-2">
    <Icon size={20} className="text-accent" />
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-6 h-6 animate-spin text-accent" />
  </div>
);

const SaveButton = ({ saving, onClick }: { saving: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    disabled={saving}
    className="w-full py-3 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover-lift disabled:opacity-50 disabled:pointer-events-none"
  >
    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save size={16} /> Salvar alterações</>}
  </button>
);

const FormField = ({ label, value, onChange, disabled }: { label: string; value: string; onChange?: (v: string) => void; disabled?: boolean }) => (
  <div>
    <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
    <input
      type="text"
      value={value}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      disabled={disabled}
      maxLength={100}
      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all disabled:opacity-50 text-sm"
    />
  </div>
);

const PasswordField = ({ label, value, onChange, show }: { label: string; value: string; onChange: (v: string) => void; show: boolean }) => (
  <div>
    <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
    <input
      type={show ? "text" : "password"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="••••••••"
      required
      minLength={6}
      maxLength={72}
      className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
    />
  </div>
);

export default Settings;
