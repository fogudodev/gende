import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, ExternalLink, Palette, Image, Type, Save, Loader2,
  CheckCircle2, X, Camera, Upload,
  AlertTriangle, Eye, ChevronDown, ChevronUp,
} from "lucide-react";
import { useProfessional } from "@/hooks/useProfessional";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const COLOR_PRESETS = [
  "#C4922A", "#E67E22", "#E74C3C", "#9B59B6",
  "#3498DB", "#1ABC9C", "#2ECC71", "#34495E",
  "#F39C12", "#D35400", "#8E44AD", "#2980B9",
];

const BG_PRESETS = [
  "#09090B", "#0F172A", "#1A1A2E", "#0D1117",
  "#FFFFFF", "#F8FAFC", "#FFF7ED", "#F0FDF4",
];

const TEXT_PRESETS = [
  "#FAFAFA", "#E2E8F0", "#F1F5F9", "#D4D4D8",
  "#09090B", "#1E293B", "#334155", "#374151",
];

type ActiveSection = null | "url" | "colors" | "images" | "texts";

const PublicPage = () => {
  const { data: professional, isLoading } = useProfessional();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [saving, setSaving] = useState(false);

  // URL
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugSuggestions, setSuggestions] = useState<string[]>([]);
  const [checkingSlug, setCheckingSlug] = useState(false);

  // Colors
  const [bgColor, setBgColor] = useState("#09090B");
  const [textColor, setTextColor] = useState("#FAFAFA");
  const [componentColor, setComponentColor] = useState("#C4922A");

  // Images
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Texts
  const [welcomeTitle, setWelcomeTitle] = useState("Bem-vindo(a)!");
  const [welcomeDescription, setWelcomeDescription] = useState("");

  useEffect(() => {
    if (professional) {
      setSlug(professional.slug || "");
      setBgColor((professional as any).bg_color || "#09090B");
      setTextColor((professional as any).text_color || "#FAFAFA");
      setComponentColor((professional as any).component_color || "#C4922A");
      setLogoUrl(professional.logo_url || "");
      setCoverUrl((professional as any).cover_url || "");
      setWelcomeTitle((professional as any).welcome_title || "Bem-vindo(a)!");
      setWelcomeDescription((professional as any).welcome_description || "");
    }
  }, [professional]);

  const generateSuggestions = (base: string) => {
    const clean = base.replace(/[^a-z0-9-]/g, "").slice(0, 40);
    const rand = Math.floor(Math.random() * 99) + 1;
    return [`${clean}-${rand}`, `${clean}-pro`];
  };

  const checkSlugAvailability = useCallback(async (value: string) => {
    if (!value || !professional) return;
    setCheckingSlug(true);
    setSlugError("");
    setSuggestions([]);

    const { data, error } = await supabase
      .from("professionals")
      .select("id")
      .eq("slug", value)
      .neq("id", professional.id)
      .maybeSingle();

    if (data) {
      setSlugError("Esta URL já está em uso!");
      setSuggestions(generateSuggestions(value));
    }
    setCheckingSlug(false);
  }, [professional]);

  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 50);
    setSlug(clean);
    setSlugError("");
    setSuggestions([]);
  };

  const uploadFile = async (file: File, type: "logo" | "cover") => {
    if (!user || !professional) return;
    const isLogo = type === "logo";
    isLogo ? setUploadingLogo(true) : setUploadingCover(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const allowed = ["jpg", "jpeg", "png", "webp"];
      if (!allowed.includes(ext)) {
        toast.error("Use JPG, PNG ou WebP.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Máximo 5MB.");
        return;
      }

      const path = `${professional.id}/${type}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("professionals")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("professionals").getPublicUrl(path);
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const field = isLogo ? "logo_url" : "cover_url";
      await supabase.from("professionals").update({ [field]: publicUrl } as any).eq("id", professional.id);

      isLogo ? setLogoUrl(publicUrl) : setCoverUrl(publicUrl);
      qc.invalidateQueries({ queryKey: ["professional"] });
      toast.success(`${isLogo ? "Logo" : "Capa"} atualizada!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer upload");
    } finally {
      isLogo ? setUploadingLogo(false) : setUploadingCover(false);
    }
  };

  const removeImage = async (type: "logo" | "cover") => {
    if (!professional) return;
    const field = type === "logo" ? "logo_url" : "cover_url";
    await supabase.from("professionals").update({ [field]: null } as any).eq("id", professional.id);
    type === "logo" ? setLogoUrl("") : setCoverUrl("");
    qc.invalidateQueries({ queryKey: ["professional"] });
    toast.success("Imagem removida");
  };

  const handleSave = async () => {
    if (!professional) return;

    // Validate slug
    if (slug) {
      setCheckingSlug(true);
      const { data } = await supabase
        .from("professionals")
        .select("id")
        .eq("slug", slug)
        .neq("id", professional.id)
        .maybeSingle();

      if (data) {
        setSlugError("Esta URL já está em uso!");
        setSuggestions(generateSuggestions(slug));
        setCheckingSlug(false);
        toast.error("A URL escolhida já está em uso. Escolha outra.");
        return;
      }
      setCheckingSlug(false);
    }

    setSaving(true);
    const { error } = await supabase
      .from("professionals")
      .update({
        slug: slug || null,
        bg_color: bgColor,
        text_color: textColor,
        component_color: componentColor,
        welcome_title: welcomeTitle.trim(),
        welcome_description: welcomeDescription.trim(),
      } as any)
      .eq("id", professional.id);

    if (error) {
      toast.error("Erro ao salvar");
    } else {
      toast.success("Página pública atualizada!");
      qc.invalidateQueries({ queryKey: ["professional"] });
    }
    setSaving(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Página Pública" subtitle="Personalize sua página de agendamento">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </DashboardLayout>
    );
  }

  const previewUrl = slug
    ? `${window.location.origin}/p/${slug}`
    : null;

  const toggleSection = (section: ActiveSection) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  return (
    <DashboardLayout title="Página Pública" subtitle="Personalize sua página de agendamento">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Settings Column */}
        <div className="space-y-4">
          {/* URL Section */}
          <SectionCard
            icon={Globe}
            title="URL Personalizada"
            isOpen={activeSection === "url"}
            onToggle={() => toggleSection("url")}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">gende.io/</span>
                <Input
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  onBlur={() => slug && checkSlugAvailability(slug)}
                  placeholder="meu-salao"
                  maxLength={50}
                  className="flex-1"
                />
                {checkingSlug && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
              </div>

              {slugError && (
                <div className="space-y-2">
                  <p className="text-sm text-destructive flex items-center gap-1.5">
                    <AlertTriangle size={14} /> {slugError}
                  </p>
                  {slugSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-muted-foreground">Sugestões:</span>
                      {slugSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setSlug(s); setSlugError(""); setSuggestions([]); }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {slug && !slugError && (
                <p className="text-xs text-muted-foreground">
                  Sua página: <span className="text-accent font-medium">gende.io/{slug}</span>
                </p>
              )}
            </div>
          </SectionCard>

          {/* Colors Section */}
          <SectionCard
            icon={Palette}
            title="Cores"
            isOpen={activeSection === "colors"}
            onToggle={() => toggleSection("colors")}
          >
            <div className="space-y-5">
              <ColorPicker
                label="Cor de Fundo"
                value={bgColor}
                onChange={setBgColor}
                presets={BG_PRESETS}
              />
              <ColorPicker
                label="Cor de Componentes (botões, destaques)"
                value={componentColor}
                onChange={setComponentColor}
                presets={COLOR_PRESETS}
              />
              <ColorPicker
                label="Cor de Todas as Fontes"
                value={textColor}
                onChange={setTextColor}
                presets={TEXT_PRESETS}
              />
            </div>
          </SectionCard>

          {/* Images Section */}
          <SectionCard
            icon={Image}
            title="Logo e Capa"
            isOpen={activeSection === "images"}
            onToggle={() => toggleSection("images")}
          >
            <div className="space-y-5">
              <ImageUpload
                label="Logo"
                imageUrl={logoUrl}
                uploading={uploadingLogo}
                onUpload={(f) => uploadFile(f, "logo")}
                onRemove={() => removeImage("logo")}
                aspect="square"
              />
              <ImageUpload
                label="Imagem de Capa"
                imageUrl={coverUrl}
                uploading={uploadingCover}
                onUpload={(f) => uploadFile(f, "cover")}
                onRemove={() => removeImage("cover")}
                aspect="wide"
              />
            </div>
          </SectionCard>

          {/* Texts Section */}
          <SectionCard
            icon={Type}
            title="Textos"
            isOpen={activeSection === "texts"}
            onToggle={() => toggleSection("texts")}
          >
            <div className="space-y-4">
              <div>
                <Label className="text-sm mb-1.5">Título de Boas-vindas</Label>
                <Input
                  value={welcomeTitle}
                  onChange={(e) => setWelcomeTitle(e.target.value)}
                  placeholder="Bem-vindo(a)!"
                  maxLength={60}
                />
              </div>
              <div>
                <Label className="text-sm mb-1.5">Descrição da Página</Label>
                <textarea
                  value={welcomeDescription}
                  onChange={(e) => setWelcomeDescription(e.target.value)}
                  placeholder="Agende seu horário de forma rápida e fácil."
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              <div className="border-t border-border/50 pt-4">
                <ColorPicker
                  label="Cor da Fonte"
                  value={textColor}
                  onChange={setTextColor}
                  presets={TEXT_PRESETS}
                />
              </div>
            </div>
          </SectionCard>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving || !!slugError}
            className="w-full h-12 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>

        {/* Preview Column */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-4 flex flex-col"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Eye size={16} className="text-accent" />
              Preview
            </h3>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <ExternalLink size={14} />
                Abrir
              </a>
            )}
          </div>

          {previewUrl ? (
            <div className="flex-1 min-h-[600px] rounded-xl overflow-hidden border border-border/50">
              <iframe
                key={slug}
                src={previewUrl}
                className="w-full h-full min-h-[600px]"
                title="Preview da página pública"
                style={{ border: "none" }}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-[600px] rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center gap-3 p-6">
              <Globe size={40} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground text-center">
                Defina uma URL personalizada para visualizar o preview da sua página pública.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

/* ============ Sub-components ============ */

const SectionCard = ({
  icon: Icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: any;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card rounded-2xl overflow-hidden"
  >
    <button
      onClick={onToggle}
      className="w-full p-5 flex items-center gap-4 hover:bg-muted/20 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
        <Icon size={18} className="text-accent" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground text-sm">{title}</h3>
      </div>
      {isOpen ? (
        <ChevronUp size={16} className="text-muted-foreground" />
      ) : (
        <ChevronDown size={16} className="text-muted-foreground" />
      )}
    </button>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="px-5 pb-5 pt-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const ColorPicker = ({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  presets: string[];
}) => (
  <div>
    <Label className="text-sm mb-2 block">{label}</Label>
    <div className="flex flex-wrap gap-2 mb-2">
      {presets.map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "w-8 h-8 rounded-lg transition-all border",
            value === c ? "ring-2 ring-offset-2 ring-accent scale-110 border-accent" : "border-border/50 hover:scale-105"
          )}
          style={{ backgroundColor: c }}
        />
      ))}
      <label className="w-8 h-8 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent transition-colors overflow-hidden relative">
        <Palette size={12} className="text-muted-foreground" />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-md border border-border/50" style={{ backgroundColor: value }} />
      <span className="text-xs text-muted-foreground font-mono">{value}</span>
    </div>
  </div>
);

const ImageUpload = ({
  label,
  imageUrl,
  uploading,
  onUpload,
  onRemove,
  aspect,
}: {
  label: string;
  imageUrl: string;
  uploading: boolean;
  onUpload: (f: File) => void;
  onRemove: () => void;
  aspect: "square" | "wide";
}) => (
  <div>
    <Label className="text-sm mb-2 block">{label}</Label>
    {imageUrl ? (
      <div className="relative group">
        <img
          src={imageUrl}
          alt={label}
          className={cn(
            "w-full object-cover rounded-xl border border-border/50",
            aspect === "square" ? "h-32" : "h-36"
          )}
        />
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    ) : (
      <label className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-accent/50 transition-colors",
        aspect === "square" ? "h-32" : "h-36"
      )}>
        {uploading ? (
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        ) : (
          <>
            <Upload size={20} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Clique para enviar</span>
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </label>
    )}
  </div>
);

export default PublicPage;
