import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import logo from "@/assets/logo-circle.png";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Wavy SVG Divider */}
      <div className="absolute top-0 left-0 w-full">
        <svg viewBox="0 0 1440 400" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-[45vh] block">
          <path
            d="M0,400 L0,0 L1440,0 L1440,400 C1300,320 1100,380 800,300 C500,220 200,340 0,400 Z"
            fill="hsl(var(--accent))"
            fillOpacity="0.10"
          />
        </svg>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center mb-12">
            <img src={logo} alt="Glow" className="w-12 h-12 rounded-2xl shadow-lg" />
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold mb-10 tracking-tight">
            Entrar
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">



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

        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
