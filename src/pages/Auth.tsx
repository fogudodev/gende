import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Phone } from "lucide-react";
import logo from "@/assets/logo-circle.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "signup";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>(() => {
    return searchParams.get("mode") === "signup" ? "signup" : "login";
  });
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const m = searchParams.get("mode");
    if (m === "signup") setMode("signup");
  }, [searchParams]);

  const formatPhone = (value: string) => {
    // Remove tudo que não é número
    const digits = value.replace(/\D/g, "");
    // Limita a 13 dígitos (55 + 2 DDD + 9 número)
    return digits.slice(0, 13);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    // Se o usuário apagar tudo, mantém vazio
    if (raw === "") {
      setPhone("");
      return;
    }
    // Garante que começa com 55
    let formatted = raw;
    if (!formatted.startsWith("55")) {
      formatted = "55" + formatted;
    }
    setPhone(formatPhone(formatted));
  };

  const displayPhone = (value: string) => {
    if (!value) return "";
    // Formata: 55 (XX) XXXXX-XXXX
    const d = value;
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)} (${d.slice(2)}`;
    if (d.length <= 9) return `${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4)}`;
    return `${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha incorretos" : error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 12) {
      toast.error("Informe um número de WhatsApp válido com DDD");
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, name, "salon", businessName || undefined, phone || undefined);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar.");
      setMode("login");
    }
    setLoading(false);
  };

  const inputClass = "bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 px-6 text-base h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Wavy SVG Divider */}
      <div className="absolute top-0 left-0 w-full">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[45vh] block">
          <path
            d="M0,400 L0,0 L1440,0 L1440,400 C1300,320 1100,380 800,300 C500,220 200,340 0,400 Z"
            fill="hsl(336, 100%, 50%)"
            fillOpacity="0.08"
          />
        </svg>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {mode === "login" && (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="flex items-center mb-12">
                <img src={logo} alt="Gende" className="w-12 h-12 rounded-2xl shadow-lg" />
              </div>

              <h1 className="text-4xl md:text-5xl font-bold mb-10 tracking-tight">Entrar</h1>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className={`${inputClass} md:py-4 md:px-8 md:text-lg`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className={`${inputClass} md:py-4 md:px-8 md:text-lg pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3 md:py-4 h-auto text-base md:text-lg font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 mt-4 border border-foreground/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Entrar
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-muted-foreground mt-8 text-sm">
                Ainda não tem conta?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-accent hover:underline font-medium"
                >
                  Criar conta
                </button>
              </p>
            </motion.div>
          )}

          {mode === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="flex items-center mb-6">
                <img src={logo} alt="Gende" className="w-12 h-12 rounded-2xl shadow-lg" />
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Criar sua conta</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Preencha seus dados e comece a organizar seu negócio.
              </p>

              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Nome completo</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Nome do Studio ou Salão</Label>
                  <Input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Ex: Studio da Maria"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className={inputClass}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">WhatsApp</Label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Phone size={16} />
                    </div>
                    <Input
                      type="tel"
                      value={displayPhone(phone)}
                      onChange={handlePhoneChange}
                      placeholder="55 (11) 99999-9999"
                      required
                      className={`${inputClass} pl-10`}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-2">
                    O DDI 55 é adicionado automaticamente. Enviaremos uma mensagem de boas-vindas!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                      className={`${inputClass} pr-14`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full py-3 h-auto text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 mt-2 border border-foreground/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <ArrowRight size={18} />
                      Criar conta
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-muted-foreground mt-6 text-sm">
                Já tem conta?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-accent hover:underline font-medium"
                >
                  Fazer login
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Auth;
