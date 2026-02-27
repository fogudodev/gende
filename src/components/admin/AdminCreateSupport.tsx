import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const AdminCreateSupport = ({ open, onClose, onCreated }: Props) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      const res = await supabase.functions.invoke("admin-create-professional", {
        body: { name, email, phone: "", password, accountType: "autonomous", businessName: "", role: "support" },
      });

      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result.error) throw new Error(result.error);

      toast.success("Usuário de suporte criado com sucesso!");
      onCreated();
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar suporte");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
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
          className="w-full max-w-md bg-card border border-border rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-accent" />
              <h2 className="text-xl font-bold text-foreground">Cadastrar Suporte</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Este usuário terá acesso ao painel de suporte e poderá responder chats de usuários.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Nome completo *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do agente de suporte"
                required
                className="bg-muted/50 border-border rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="suporte@exemplo.com"
                required
                className="bg-muted/50 border-border rounded-xl"
              />
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
                  Criar Suporte
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminCreateSupport;
