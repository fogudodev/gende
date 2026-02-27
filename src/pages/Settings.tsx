import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CreditCard, Clock, Globe, Shield, MessageSquare,
  ArrowLeft, Save, Loader2, CheckCircle2, QrCode, Power,
  Palette, Eye, EyeOff, Crown, AlertTriangle, Camera, ImageIcon, X,
  Plus, Trash2, CalendarOff, Plane, Calendar as CalendarIcon,
} from "lucide-react";
import { GoogleCalendarSection } from "@/components/settings/GoogleCalendarSection";
import { useProfessional } from "@/hooks/useProfessional";
import { useWorkingHours, getDayName, useUpsertWorkingHours } from "@/hooks/useWorkingHours";
import { useBlockedTimes, useCreateBlockedTime, useDeleteBlockedTime } from "@/hooks/useBlockedTimes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubscription } from "@/hooks/useSubscription";
import { useWhatsAppInstance, useWhatsAppAutomations, useToggleAutomation } from "@/hooks/useWhatsApp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { STRIPE_PLANS } from "@/lib/stripe-plans";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Section = "system" | "hours" | "subscription" | "whatsapp" | "security" | "google-calendar";

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
    { id: "system" as Section, icon: Palette, title: "Aparência do Sistema", description: "Logo, nome e cores do painel" },
    { id: "hours" as Section, icon: Clock, title: "Horários de Trabalho", description: "Defina seus dias e horários de atendimento" },
    { id: "subscription" as Section, icon: CreditCard, title: "Assinatura", description: "Plano atual e gerenciamento" },
    { id: "whatsapp" as Section, icon: MessageSquare, title: "Automação WhatsApp", description: "QR Code, instância e automações" },
    { id: "google-calendar" as Section, icon: CalendarIcon, title: "Google Calendar", description: "Sincronize sua agenda com o Google" },
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

              {activeSection === "system" && <SystemAppearanceSection />}
              {activeSection === "hours" && <WorkingHoursSection />}
              {activeSection === "subscription" && <SubscriptionSection />}
              {activeSection === "whatsapp" && <WhatsAppSection />}
              {activeSection === "google-calendar" && <GoogleCalendarSection />}
              {activeSection === "security" && <SecuritySection />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

/* ===================== SYSTEM APPEARANCE ===================== */
const ACCENT_PRESETS = [
  "#FF0066", "#C4922A", "#E67E22", "#E74C3C", "#9B59B6",
  "#3498DB", "#1ABC9C", "#2ECC71", "#F39C12", "#D35400",
  "#8E44AD", "#2980B9",
];

const SIDEBAR_PRESETS = [
  "#09090B", "#0F172A", "#1A1A2E", "#0D1117",
  "#1E1E2E", "#2D2D3F", "#111827", "#18181B",
];

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const SystemAppearanceSection = () => {
  const { data: professional, isLoading } = useProfessional();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#FF0066");
  const [sidebarColor, setSidebarColor] = useState("#09090B");

  useEffect(() => {
    if (professional) {
      setBusinessName(professional.business_name || professional.name || "");
      setLogoUrl(professional.logo_url || "");
      setAccentColor((professional as any).system_accent_color || professional.primary_color || "#FF0066");
      setSidebarColor((professional as any).system_sidebar_color || "#09090B");
    }
  }, [professional]);

  const uploadLogo = async (file: File) => {
    if (!user || !professional) return;
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
        toast.error("Use JPG, PNG ou WebP."); return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Máximo 5MB."); return;
      }
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("professionals").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("professionals").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("professionals").update({ logo_url: publicUrl }).eq("id", professional.id);
      setLogoUrl(publicUrl);
      qc.invalidateQueries({ queryKey: ["professional"] });
      toast.success("Logo atualizada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      setUploadingLogo(false);
    }
  };

  const removeLogo = async () => {
    if (!professional) return;
    await supabase.from("professionals").update({ logo_url: null }).eq("id", professional.id);
    setLogoUrl("");
    qc.invalidateQueries({ queryKey: ["professional"] });
    toast.success("Logo removida");
  };

  const handleSave = async () => {
    if (!professional) return;
    setSaving(true);

    const { error } = await supabase
      .from("professionals")
      .update({
        business_name: businessName.trim(),
        system_accent_color: accentColor,
        system_sidebar_color: sidebarColor,
      } as any)
      .eq("id", professional.id);

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      // Apply colors immediately
      applySystemColors(accentColor, sidebarColor);
      toast.success("Aparência atualizada!");
      qc.invalidateQueries({ queryKey: ["professional"] });
    }
    setSaving(false);
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <SectionHeader icon={Palette} title="Aparência do Sistema" />

      {/* Logo & Name */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Camera size={16} className="text-accent" /> Logo e Nome do Menu
        </h3>
        <div className="flex items-center gap-5">
          <ImageUploadCard
            label="Logo"
            imageUrl={logoUrl}
            uploading={uploadingLogo}
            icon={<ImageIcon size={24} className="text-muted-foreground" />}
            onUpload={uploadLogo}
            onRemove={removeLogo}
          />
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome exibido no menu</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={30}
              placeholder="Nome do seu negócio"
              className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* System Accent Color */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-accent" />
          <h3 className="font-semibold text-foreground">Cor de Destaque (Accent)</h3>
        </div>
        <p className="text-xs text-muted-foreground">Usada em botões, ícones ativos e destaques do sistema.</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setAccentColor(c)}
              className={cn(
                "w-9 h-9 rounded-xl transition-all",
                accentColor === c ? "ring-2 ring-offset-2 ring-accent scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="w-9 h-9 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden relative">
            <Palette size={14} className="text-muted-foreground" />
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: accentColor }} />
          <span className="text-sm text-muted-foreground font-mono">{accentColor}</span>
        </div>
      </div>

      {/* Sidebar Color */}
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Palette size={18} className="text-accent" />
          <h3 className="font-semibold text-foreground">Cor da Sidebar</h3>
        </div>
        <p className="text-xs text-muted-foreground">Cor de fundo do menu lateral.</p>
        <div className="flex flex-wrap gap-3">
          {SIDEBAR_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setSidebarColor(c)}
              className={cn(
                "w-9 h-9 rounded-xl transition-all border border-border/30",
                sidebarColor === c ? "ring-2 ring-offset-2 ring-accent scale-110" : "hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <label className="w-9 h-9 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden relative">
            <Palette size={14} className="text-muted-foreground" />
            <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-border/30" style={{ backgroundColor: sidebarColor }} />
          <span className="text-sm text-muted-foreground font-mono">{sidebarColor}</span>
        </div>
      </div>

      {/* Preview */}
      <div className="glass-card rounded-2xl p-6 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Preview</h3>
        <div className="flex rounded-xl overflow-hidden border border-border/50 h-24">
          <div className="w-16 flex flex-col items-center justify-center gap-2 py-3" style={{ backgroundColor: sidebarColor }}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: accentColor }}>
                {businessName?.[0]?.toUpperCase() || "G"}
              </div>
            )}
            <div className="w-6 h-1 rounded-full" style={{ backgroundColor: accentColor }} />
            <div className="w-6 h-0.5 rounded-full bg-white/20" />
            <div className="w-6 h-0.5 rounded-full bg-white/20" />
          </div>
          <div className="flex-1 bg-background p-3 flex flex-col justify-center">
            <div className="h-2 w-20 rounded-full bg-foreground/20 mb-2" />
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded-lg" style={{ backgroundColor: accentColor, opacity: 0.2 }} />
              <div className="h-8 w-16 rounded-lg bg-muted" />
              <div className="h-8 w-16 rounded-lg bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <SaveButton saving={saving} onClick={handleSave} />
    </div>
  );
};

/** Apply system colors as CSS variables on :root */
export function applySystemColors(accent?: string | null, sidebar?: string | null) {
  if (!accent && !sidebar) return;
  const root = document.documentElement;
  if (accent) {
    const hsl = hexToHsl(accent);
    root.style.setProperty("--primary", hsl);
    root.style.setProperty("--accent", hsl);
    root.style.setProperty("--ring", hsl);
    root.style.setProperty("--sidebar-primary", hsl);
    root.style.setProperty("--sidebar-ring", hsl);
  }
  if (sidebar) {
    const hsl = hexToHsl(sidebar);
    root.style.setProperty("--sidebar-background", hsl);
  }
}

/* ===================== PROFILE SECTION ===================== */
const ProfileSection = () => {
  const { data: professional, isLoading } = useProfessional();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [form, setForm] = useState({
    name: "", business_name: "", email: "", phone: "",
    bio: "", slug: "", primary_color: "#C4922A",
    avatar_url: "", logo_url: "",
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
        avatar_url: professional.avatar_url || "",
        logo_url: professional.logo_url || "",
      });
    }
  }, [professional]);

  const uploadFile = async (file: File, type: "avatar" | "logo") => {
    if (!user || !professional) return;
    const isAvatar = type === "avatar";
    isAvatar ? setUploadingAvatar(true) : setUploadingLogo(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
      if (!allowed.includes(ext)) {
        toast.error("Formato não suportado. Use JPG, PNG ou WebP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 5MB.");
        return;
      }

      const path = `${user.id}/${type}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("professionals")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("professionals")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const updateField = isAvatar ? "avatar_url" : "logo_url";
      const { error: dbError } = await supabase
        .from("professionals")
        .update({ [updateField]: publicUrl })
        .eq("id", professional.id);

      if (dbError) throw dbError;

      setForm((prev) => ({ ...prev, [updateField]: publicUrl }));
      qc.invalidateQueries({ queryKey: ["professional"] });
      toast.success(`${isAvatar ? "Foto" : "Logo"} atualizada!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      isAvatar ? setUploadingAvatar(false) : setUploadingLogo(false);
    }
  };

  const removeImage = async (type: "avatar" | "logo") => {
    if (!professional) return;
    const updateField = type === "avatar" ? "avatar_url" : "logo_url";
    const { error } = await supabase
      .from("professionals")
      .update({ [updateField]: null })
      .eq("id", professional.id);

    if (!error) {
      setForm((prev) => ({ ...prev, [updateField]: "" }));
      qc.invalidateQueries({ queryKey: ["professional"] });
      toast.success("Imagem removida");
    }
  };

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

      {/* Avatar & Logo Upload */}
      <div className="glass-card rounded-2xl p-6 space-y-5">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Camera size={16} className="text-accent" /> Foto e Logo
        </h3>
        <div className="flex flex-wrap gap-6">
          {/* Avatar */}
          <ImageUploadCard
            label="Foto de Perfil"
            imageUrl={form.avatar_url}
            uploading={uploadingAvatar}
            icon={<User size={24} className="text-muted-foreground" />}
            onUpload={(f) => uploadFile(f, "avatar")}
            onRemove={() => removeImage("avatar")}
            rounded
          />
          {/* Logo */}
          <ImageUploadCard
            label="Logo do Negócio"
            imageUrl={form.logo_url}
            uploading={uploadingLogo}
            icon={<ImageIcon size={24} className="text-muted-foreground" />}
            onUpload={(f) => uploadFile(f, "logo")}
            onRemove={() => removeImage("logo")}
          />
        </div>
      </div>

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

const REASON_PRESETS = [
  { label: "Falta", icon: "🚫" },
  { label: "Férias", icon: "🏖️" },
  { label: "Viagem", icon: "✈️" },
  { label: "Consulta médica", icon: "🏥" },
  { label: "Outro", icon: "📝" },
];

const WorkingHoursSection = () => {
  const { data: hours, isLoading } = useWorkingHours();
  const upsert = useUpsertWorkingHours();
  const { data: blockedTimes, isLoading: blockedLoading } = useBlockedTimes();
  const createBlocked = useCreateBlockedTime();
  const deleteBlocked = useDeleteBlockedTime();

  const [local, setLocal] = useState(DEFAULT_HOURS);
  const [showAddBlocked, setShowAddBlocked] = useState(false);

  // Blocked time form
  const [blockedType, setBlockedType] = useState<"period" | "hours">("period");
  const [blockedStartDate, setBlockedStartDate] = useState("");
  const [blockedEndDate, setBlockedEndDate] = useState("");
  const [blockedDate, setBlockedDate] = useState("");
  const [blockedStartTime, setBlockedStartTime] = useState("09:00");
  const [blockedEndTime, setBlockedEndTime] = useState("18:00");
  const [blockedReason, setBlockedReason] = useState("Falta");

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

  const handleAddBlocked = async () => {
    let startTime: string;
    let endTime: string;

    if (blockedType === "period") {
      if (!blockedStartDate || !blockedEndDate) {
        toast.error("Selecione as datas de início e fim");
        return;
      }
      startTime = new Date(`${blockedStartDate}T00:00:00`).toISOString();
      endTime = new Date(`${blockedEndDate}T23:59:59`).toISOString();
    } else {
      if (!blockedDate) {
        toast.error("Selecione a data");
        return;
      }
      startTime = new Date(`${blockedDate}T${blockedStartTime}:00`).toISOString();
      endTime = new Date(`${blockedDate}T${blockedEndTime}:00`).toISOString();
    }

    try {
      await createBlocked.mutateAsync({
        start_time: startTime,
        end_time: endTime,
        reason: blockedReason,
      });
      toast.success("Ausência registrada!");
      setShowAddBlocked(false);
      setBlockedStartDate("");
      setBlockedEndDate("");
      setBlockedDate("");
      setBlockedReason("Falta");
    } catch {
      toast.error("Erro ao registrar ausência");
    }
  };

  const handleDeleteBlocked = async (id: string) => {
    try {
      await deleteBlocked.mutateAsync(id);
      toast.success("Ausência removida");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  if (isLoading || blockedLoading) return <LoadingState />;

  const now = new Date();
  const futureBlocked = (blockedTimes || []).filter(b => new Date(b.end_time) >= now);
  const pastBlocked = (blockedTimes || []).filter(b => new Date(b.end_time) < now);

  return (
    <div className="space-y-6">
      <SectionHeader icon={Clock} title="Horários de Trabalho" />

      {/* Working hours grid */}
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

      {/* Blocked Times / Absences */}
      <div className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarOff size={20} className="text-accent" />
            <h2 className="text-lg font-bold text-foreground">Ausências</h2>
          </div>
          <button
            onClick={() => setShowAddBlocked(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} /> Nova ausência
          </button>
        </div>

        {futureBlocked.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Plane size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma ausência programada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Registre férias, faltas ou horários indisponíveis</p>
          </div>
        ) : (
          <div className="space-y-2">
            {futureBlocked.map(bt => {
              const start = new Date(bt.start_time);
              const end = new Date(bt.end_time);
              const isFullDay = start.getHours() === 0 && end.getHours() === 23;
              const isSameDate = format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd");
              const isMultiDay = !isSameDate && isFullDay;

              return (
                <motion.div
                  key={bt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-4 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                      <CalendarOff size={18} className="text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{bt.reason || "Ausência"}</p>
                      <p className="text-xs text-muted-foreground">
                        {isMultiDay ? (
                          `${format(start, "dd/MM/yyyy", { locale: ptBR })} → ${format(end, "dd/MM/yyyy", { locale: ptBR })}`
                        ) : isSameDate && !isFullDay ? (
                          `${format(start, "dd/MM/yyyy", { locale: ptBR })} • ${format(start, "HH:mm")} - ${format(end, "HH:mm")}`
                        ) : (
                          `${format(start, "dd/MM/yyyy", { locale: ptBR })} (dia inteiro)`
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteBlocked(bt.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {pastBlocked.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              {pastBlocked.length} ausência{pastBlocked.length > 1 ? "s" : ""} passada{pastBlocked.length > 1 ? "s" : ""}
            </summary>
            <div className="space-y-1 mt-2 opacity-50">
              {pastBlocked.map(bt => (
                <div key={bt.id} className="flex items-center justify-between glass-card rounded-lg p-3">
                  <div>
                    <p className="text-xs font-medium text-foreground">{bt.reason || "Ausência"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(bt.start_time), "dd/MM/yyyy")} → {format(new Date(bt.end_time), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteBlocked(bt.id)} className="p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Add Blocked Time Dialog */}
      <Dialog open={showAddBlocked} onOpenChange={setShowAddBlocked}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarOff size={18} className="text-primary" />
              Nova Ausência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Reason presets */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Motivo</Label>
              <div className="flex flex-wrap gap-2">
                {REASON_PRESETS.map(r => (
                  <button
                    key={r.label}
                    onClick={() => setBlockedReason(r.label)}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-lg border transition-all font-medium",
                      blockedReason === r.label
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-foreground border-border/30 hover:border-primary/50"
                    )}
                  >
                    {r.icon} {r.label}
                  </button>
                ))}
              </div>
              {blockedReason === "Outro" && (
                <Input
                  placeholder="Descreva o motivo..."
                  className="mt-2"
                  onChange={e => setBlockedReason(e.target.value || "Outro")}
                />
              )}
            </div>

            {/* Type toggle */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Tipo de ausência</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setBlockedType("period")}
                  className={cn(
                    "flex-1 text-xs py-2.5 rounded-xl border transition-all font-medium flex items-center justify-center gap-1.5",
                    blockedType === "period"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-foreground border-border/30"
                  )}
                >
                  <CalendarIcon size={13} /> Dia(s) inteiro(s)
                </button>
                <button
                  onClick={() => setBlockedType("hours")}
                  className={cn(
                    "flex-1 text-xs py-2.5 rounded-xl border transition-all font-medium flex items-center justify-center gap-1.5",
                    blockedType === "hours"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-foreground border-border/30"
                  )}
                >
                  <Clock size={13} /> Horário específico
                </button>
              </div>
            </div>

            {blockedType === "period" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5">Data início</Label>
                  <Input type="date" value={blockedStartDate} onChange={e => setBlockedStartDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5">Data fim</Label>
                  <Input type="date" value={blockedEndDate} onChange={e => setBlockedEndDate(e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5">Data</Label>
                  <Input type="date" value={blockedDate} onChange={e => setBlockedDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5">De</Label>
                    <Input type="time" value={blockedStartTime} onChange={e => setBlockedStartTime(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5">Até</Label>
                    <Input type="time" value={blockedEndTime} onChange={e => setBlockedEndTime(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <Button onClick={handleAddBlocked} disabled={createBlocked.isPending} className="w-full">
              {createBlocked.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
              Registrar Ausência
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ===================== SUBSCRIPTION ===================== */
const SubscriptionSection = () => {
  const { data: subscription, isLoading } = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const currentPlan = subscription?.plan_id || "none";
  const normalizedPlan = currentPlan === "free" ? "none" : currentPlan === "starter" ? "essencial" : currentPlan === "pro" ? "enterprise" : currentPlan;

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

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setBilling("monthly")}
          className={cn(
            "text-xs px-5 py-2 rounded-xl font-medium transition-all",
            billing === "monthly" ? "gradient-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          Mensal
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={cn(
            "text-xs px-5 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5",
            billing === "annual" ? "gradient-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          Anual <span className="text-[9px] bg-accent/20 px-1.5 py-0.5 rounded-full">2 meses grátis</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {(Object.entries(STRIPE_PLANS) as [string, typeof STRIPE_PLANS[keyof typeof STRIPE_PLANS]][]).map(([id, plan]) => {
          const isCurrent = id === normalizedPlan;
          const price = billing === "annual" ? plan.priceAnnual : plan.priceMonthly;
          const period = billing === "annual" ? "/ano" : "/mês";
          const priceId = billing === "annual" ? plan.priceIdAnnual : plan.priceId;

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
              <p className="text-2xl font-bold text-foreground">{price}<span className="text-xs text-muted-foreground font-normal">{period}</span></p>
              {billing === "annual" && (
                <p className="text-[10px] text-muted-foreground -mt-2">
                  <span className="line-through">{id === "essencial" ? "R$ 598,80" : "R$ 1.198,80"}</span>
                </p>
              )}
              <ul className="space-y-1.5">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="text-accent mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {!isCurrent && priceId && (
                <button
                  onClick={() => handleCheckout(priceId)}
                  disabled={loadingCheckout === priceId}
                  className="w-full py-2 rounded-xl gradient-accent text-accent-foreground text-xs font-semibold hover-lift disabled:opacity-50"
                >
                  {loadingCheckout === priceId ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : "Assinar"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {normalizedPlan !== "none" && (
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

const ImageUploadCard = ({
  label, imageUrl, uploading, icon, onUpload, onRemove, rounded,
}: {
  label: string; imageUrl: string; uploading: boolean;
  icon: React.ReactNode; onUpload: (f: File) => void; onRemove: () => void;
  rounded?: boolean;
}) => (
  <div className="flex flex-col items-center gap-2">
    <div className={cn(
      "w-24 h-24 relative group overflow-hidden border-2 border-dashed border-border bg-muted/30 flex items-center justify-center",
      rounded ? "rounded-full" : "rounded-2xl"
    )}>
      {imageUrl ? (
        <>
          <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <label className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 cursor-pointer transition-colors">
              <Camera size={14} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
            </label>
            <button onClick={onRemove} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X size={14} className="text-white" />
            </button>
          </div>
        </>
      ) : (
        <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
          {uploading ? <Loader2 size={20} className="animate-spin text-accent" /> : icon}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
        </label>
      )}
    </div>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

export default Settings;
