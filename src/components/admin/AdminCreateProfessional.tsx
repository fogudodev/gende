import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, User, Building2, ArrowRight, Loader2, Eye, EyeOff, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountType = "autonomous" | "salon";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const AdminCreateProfessional = ({ open, onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("autonomous");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const res = await supabase.functions.invoke("admin-create-professional", {
        body: { name, email, phone, password, accountType, businessName },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result.error) throw new Error(result.error);

      const whatsappMsg = result.whatsappSent
        ? " Credenciais enviadas via WhatsApp! 📱"
        : phone
          ? " ⚠️ Não foi possível enviar WhatsApp (verifique se há instância conectada)."
          : "";

      toast.success(`Profissional criado com sucesso!${whatsappMsg}`);
      onCreated();
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar profissional");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setBusinessName("");
    setAccountType("autonomous");
    setShowPassword(false);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Cadastrar Profissional</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Account type selector */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType("autonomous")}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left text-sm font-medium ${
                accountType === "autonomous"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <User size={18} />
              Autônomo
            </button>
            <button
              type="button"
              onClick={() => setAccountType("salon")}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left text-sm font-medium ${
                accountType === "salon"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              <Building2 size={18} />
              Salão / Barbearia
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Nome completo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do profissional"
                required
                className="bg-muted/50 border-border rounded-xl"
              />
            </div>

            {accountType === "salon" && (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">Nome do estabelecimento *</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Ex: Barbearia do João"
                  required
                  className="bg-muted/50 border-border rounded-xl"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className="bg-muted/50 border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs flex items-center gap-1.5">
                <MessageSquare size={12} />
                WhatsApp (para envio das credenciais)
              </Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999999999"
                className="bg-muted/50 border-border rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground">
                Se informado, as credenciais serão enviadas automaticamente via WhatsApp.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Senha *</Label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[10px] text-accent hover:underline font-medium"
                >
                  Gerar senha automática
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="bg-muted/50 border-border rounded-xl pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl h-11 text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-all"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <ArrowRight size={16} />
                  Criar Profissional
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminCreateProfessional;
