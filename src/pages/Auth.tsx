import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Scissors, Building2, User } from "lucide-react";
import logo from "@/assets/logo-circle.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AccountType = "autonomous" | "salon";
type AuthMode = "login" | "signup" | "choose-type";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

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
    if (!accountType) return;
    setLoading(true);
    const { error } = await signUp(email, password, name, accountType, businessName || undefined);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu email para confirmar.");
      setMode("login");
    }
    setLoading(false);
  };

  const handleChooseType = (type: AccountType) => {
    setAccountType(type);
    setMode("signup");
  };

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
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 md:py-4 px-6 md:px-8 text-base md:text-lg h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary"
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
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 md:py-4 px-6 md:px-8 text-base md:text-lg h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary pr-14"
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
                  onClick={() => setMode("choose-type")}
                  className="text-accent hover:underline font-medium"
                >
                  Criar conta
                </button>
              </p>
            </motion.div>
          )}

          {mode === "choose-type" && (
            <motion.div
              key="choose-type"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg"
            >
              <div className="flex items-center mb-12">
                <img src={logo} alt="Gende" className="w-12 h-12 rounded-2xl shadow-lg" />
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">Como você trabalha?</h1>
              <p className="text-muted-foreground mb-10">Escolha o tipo de conta que melhor se encaixa no seu negócio.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => handleChooseType("autonomous")}
                  className="group relative bg-card border-2 border-border hover:border-accent rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <User className="text-accent" size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Profissional Autônomo</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Trabalho sozinho(a) e gerencio minha própria agenda, clientes e finanças.
                  </p>
                </button>

                <button
                  onClick={() => handleChooseType("salon")}
                  className="group relative bg-card border-2 border-border hover:border-accent rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <Building2 className="text-accent" size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Salão / Barbearia</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Tenho uma equipe de profissionais e preciso gerenciar funcionários, comissões e repasses.
                  </p>
                </button>
              </div>

              <p className="text-center text-muted-foreground mt-8 text-sm">
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

          {mode === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-md"
            >
              <div className="flex items-center mb-8">
                <img src={logo} alt="Gende" className="w-12 h-12 rounded-2xl shadow-lg" />
              </div>

              <button
                onClick={() => setMode("choose-type")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors text-sm"
              >
                <ArrowLeft size={16} />
                Voltar
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  {accountType === "salon" ? <Building2 className="text-accent" size={20} /> : <User className="text-accent" size={20} />}
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Criar conta</h1>
                  <p className="text-sm text-muted-foreground">
                    {accountType === "salon" ? "Salão / Barbearia" : "Profissional Autônomo"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSignup} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Seu nome</Label>
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 px-6 text-base h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary"
                  />
                </div>

                {accountType === "salon" && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-sm pl-2">Nome do estabelecimento</Label>
                    <Input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Ex: Barbearia do João"
                      required
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 px-6 text-base h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-sm pl-2">Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 px-6 text-base h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary"
                  />
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
                      className="bg-card border-border text-foreground placeholder:text-muted-foreground rounded-full py-3 px-6 text-base h-auto focus:border-accent focus:ring-accent transition-all duration-300 hover:bg-secondary pr-14"
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
                  className="w-full rounded-full py-3 h-auto text-base font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 mt-4 border border-foreground/20"
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

              <p className="text-center text-muted-foreground mt-8 text-sm">
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
