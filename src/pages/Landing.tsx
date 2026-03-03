import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  Calendar, Bell, CreditCard, BarChart3, Users, DollarSign,
  X, ChevronRight, Star, Check, Gift, Shield, ArrowRight,
  Sparkles, Clock, TrendingUp, MessageCircle, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-circle.png";
import logoDark from "@/assets/logo-dark.png";

// ─── Scroll-triggered animation wrapper ───
const FadeInSection = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Animated counter ───
const AnimatedCounter = ({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 2000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [isInView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString("pt-BR")}{suffix}</span>;
};

// ─── Countdown timer ───
const CountdownTimer = () => {
  const [time, setTime] = useState({ h: 23, m: 59, s: 59 });
  useEffect(() => {
    const t = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    <div className="flex gap-2.5 justify-center">
      {[
        { label: "Horas", val: time.h },
        { label: "Min", val: time.m },
        { label: "Seg", val: time.s },
      ].map(({ label, val }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-card/80 backdrop-blur-xl border border-primary/20 flex items-center justify-center text-xl sm:text-3xl font-bold text-foreground shadow-lg">
            {pad(val)}
          </div>
          <span className="text-[10px] sm:text-xs text-muted-foreground mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Floating shapes background ───
const FloatingShapes = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute rounded-full opacity-[0.04]"
        style={{
          width: 150 + i * 80,
          height: 150 + i * 80,
          background: `radial-gradient(circle, hsl(var(--primary)), transparent)`,
          top: `${10 + i * 20}%`,
          left: `${-10 + i * 25}%`,
        }}
        animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
        transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  const goToSignup = () => navigate("/auth");

  const features = [
    { icon: Calendar, title: "Agenda online 24h", desc: "Seus clientes agendam a qualquer momento, sem precisar ligar." },
    { icon: Bell, title: "Lembretes automáticos", desc: "Reduza faltas em até 60% com alertas por WhatsApp." },
    { icon: CreditCard, title: "Pagamentos integrados", desc: "PIX, cartão e dinheiro — tudo registrado automaticamente." },
    { icon: BarChart3, title: "Relatórios inteligentes", desc: "Saiba exatamente quanto entra e sai do seu negócio." },
    { icon: Users, title: "Gestão de clientes", desc: "Histórico completo, preferências e comunicação centralizada." },
    { icon: DollarSign, title: "Controle financeiro", desc: "Despesas, receitas, comissões e lucro em um só lugar." },
  ];

  const testimonials = [
    { name: "Carla M.", role: "Cabeleireira", text: "Aumentei 38% do faturamento em 2 meses. Nunca imaginei que organização faria tanta diferença.", stars: 5 },
    { name: "Rafael S.", role: "Barbeiro", text: "Reduzi faltas em quase 60%. Os lembretes automáticos mudaram meu negócio completamente.", stars: 5 },
    { name: "Ana P.", role: "Dona de salão", text: "Hoje tenho previsibilidade do meu mês inteiro. Sei exatamente quanto vou faturar.", stars: 5 },
  ];

  const enemies = [
    "Cancelamentos sem aviso",
    "Horários vazios",
    "Clientes que não voltam",
    "Falta de previsibilidade financeira",
    "Dependência total do WhatsApp",
  ];

  const bonuses = [
    { title: "Modelo de mensagens automáticas prontas", desc: "Templates testados para confirmação, lembrete e pós-atendimento." },
    { title: "Planilha estratégica de precificação", desc: "Descubra o preço ideal para cada serviço e maximize seu lucro." },
    { title: "Mini treinamento: Como lotar sua agenda", desc: "Estratégias práticas para preencher horários vazios rapidamente." },
    { title: "Checklist de organização financeira", desc: "O passo a passo para ter controle total do seu dinheiro." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <FloatingShapes />

      {/* ══════════ NAVBAR ══════════ */}
      <nav className="fixed top-0 w-full z-50 bg-background/70 backdrop-blur-2xl border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14 sm:h-16">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-8 h-8 rounded-xl" />
            <span className="font-display font-bold text-base hidden sm:block">Gende</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs sm:text-sm px-3">
              Entrar
            </Button>
            <Button size="sm" onClick={goToSignup} className="rounded-full text-xs sm:text-sm px-4 sm:px-5 bg-primary text-primary-foreground hover:bg-primary/90">
              Criar conta grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* ══════════ 1. HERO ══════════ */}
      <motion.section style={{ opacity: heroOpacity, scale: heroScale }} className="relative pt-20 sm:pt-36 pb-12 sm:pb-32 px-4">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeInSection>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Sparkles size={12} /> +3.000 profissionais já transformaram seus negócios
            </span>
          </FadeInSection>

          <FadeInSection delay={0.1}>
            <h1 className="font-display text-[1.75rem] sm:text-5xl md:text-7xl font-extrabold leading-[1.12] tracking-tight mb-4 sm:mb-6">
              Ela era talentosa.{" "}
              <span className="text-gradient">Mas estava quase desistindo.</span>
            </h1>
          </FadeInSection>

          <FadeInSection delay={0.2}>
            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-3 sm:mb-4 leading-relaxed">
              Clientes esquecendo horário. Agenda bagunçada. Dinheiro entrando… mas sem controle.
            </p>
            <p className="text-sm sm:text-lg text-muted-foreground/80 max-w-xl mx-auto mb-2 sm:mb-3">
              Até que ela decidiu parar de improvisar e começou a administrar o salão como uma <strong className="text-foreground">empresa</strong>.
            </p>
            <p className="text-sm sm:text-lg font-medium text-foreground max-w-xl mx-auto mb-6 sm:mb-10">
              Em 90 dias, a agenda estava lotada. O faturamento cresceu. O estresse diminuiu.
            </p>
          </FadeInSection>

          <FadeInSection delay={0.3}>
            <Button
              onClick={goToSignup}
              size="lg"
              className="relative rounded-full text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/30 group"
            >
              <span className="absolute inset-0 rounded-full animate-pulse bg-primary/20" />
              <span className="relative flex items-center gap-2">
                🔥 Quero essa transformação
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
          </FadeInSection>

          {/* Mock device */}
          <FadeInSection delay={0.5} className="mt-10 sm:mt-20">
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-2xl sm:rounded-3xl blur-3xl" />
              <div className="relative glass-card-strong rounded-xl sm:rounded-3xl overflow-hidden border border-primary/10">
                <div className="h-7 sm:h-8 bg-card/80 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 border-b border-border/30">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-destructive/60" />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-warning/60" />
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-success/60" />
                </div>
                <div className="p-4 sm:p-10 space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                    <img src={logo} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg" />
                    <div className="h-2.5 sm:h-3 w-20 sm:w-24 bg-muted rounded-full" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {[
                      { label: "Agendamentos", val: "248", color: "primary" },
                      { label: "Faturamento", val: "R$ 18.4k", color: "success" },
                      { label: "Clientes", val: "167", color: "info" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="glass-card rounded-lg sm:rounded-xl p-2.5 sm:p-4 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{label}</p>
                        <p className={`text-sm sm:text-xl font-bold text-${color}`}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 glass-card rounded-lg sm:rounded-xl">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Clock size={12} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="h-2 sm:h-2.5 w-20 sm:w-28 bg-muted rounded-full" />
                          <div className="h-1.5 sm:h-2 w-14 sm:w-20 bg-muted/60 rounded-full mt-1" />
                        </div>
                        <div className="h-5 sm:h-6 w-12 sm:w-16 rounded-full bg-success/10 border border-success/20 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </motion.section>

      {/* ══════════ 2. QUEBRA DE CRENÇA ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="max-w-3xl mx-auto text-center">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold mb-5 sm:mb-8">
              O problema <span className="text-gradient">nunca foi</span> seu talento.
            </h2>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <p className="text-lg sm:text-2xl text-muted-foreground leading-relaxed mb-8 sm:mb-12">
              Você aprendeu a atender.<br />
              Mas <strong className="text-foreground">ninguém te ensinou a gerir.</strong>
            </p>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-left max-w-2xl mx-auto mb-8 sm:mb-12">
            {[
              ["Você não perde clientes por falta de qualidade", "Você perde por falta de organização"],
              ["Você não fatura pouco por falta de demanda", "Você fatura pouco por falta de sistema"],
            ].map(([wrong, right], i) => (
              <FadeInSection key={i} delay={0.15 + i * 0.1}>
                <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover-lift">
                  <p className="text-muted-foreground text-xs sm:text-sm mb-1.5 sm:mb-2 line-through">{wrong}</p>
                  <p className="font-semibold text-foreground text-sm sm:text-base">{right}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
          <FadeInSection delay={0.4}>
            <p className="font-display text-xl sm:text-3xl font-bold">
              "Salão não é hobby. <span className="text-gradient">É empresa.</span>"
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════ 3. O INIMIGO INVISÍVEL ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-destructive/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold mb-5 sm:mb-6">
              O improviso <span className="text-destructive">custa caro.</span>
            </h2>
          </FadeInSection>
          <div className="space-y-2.5 sm:space-y-3 max-w-md mx-auto mb-8 sm:mb-12">
            {enemies.map((item, i) => (
              <FadeInSection key={i} delay={0.1 + i * 0.08}>
                <div className="flex items-center gap-3 glass-card rounded-lg sm:rounded-xl p-3 sm:p-4 hover-lift">
                  <X size={18} className="text-destructive shrink-0" />
                  <p className="text-foreground font-medium text-left text-sm sm:text-base">{item}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
          <FadeInSection delay={0.6}>
            <p className="text-base sm:text-xl text-muted-foreground italic px-2">
              "Todo mês que você adia a organização, você paga com <strong className="text-foreground">crescimento</strong>."
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════ 4. A VIRADA — FEATURES ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="font-display text-2xl sm:text-5xl font-extrabold mb-3 sm:mb-4">
                A estrutura que transforma{" "}
                <span className="text-gradient">talento em faturamento.</span>
              </h2>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {features.map((f, i) => (
              <FadeInSection key={i} delay={0.05 * i}>
                <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-8 hover-lift group h-full">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center mb-3 sm:mb-5 group-hover:bg-primary/20 transition-colors">
                    <f.icon size={20} className="text-primary sm:hidden" />
                    <f.icon size={26} className="text-primary hidden sm:block" />
                  </div>
                  <h3 className="font-display text-sm sm:text-lg font-bold mb-1 sm:mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
          <FadeInSection delay={0.4} className="text-center mt-8 sm:mt-12">
            <p className="font-display text-lg sm:text-2xl font-semibold">
              Você atende. O sistema organiza. <span className="text-gradient">O negócio cresce.</span>
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════ 5. PROVA SOCIAL ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold text-center mb-3 sm:mb-4">
              Eles decidiram <span className="text-gradient">agir.</span>
            </h2>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <div className="text-center mb-8 sm:mb-16">
              <p className="text-3xl sm:text-5xl font-extrabold text-gradient font-display">
                +R$ <AnimatedCounter target={2800000} prefix="" suffix="" />
              </p>
              <p className="text-muted-foreground text-sm sm:text-base mt-1 sm:mt-2">já movimentados através da plataforma</p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
            {testimonials.map((t, i) => (
              <FadeInSection key={i} delay={0.1 + i * 0.1}>
                <div className="glass-card rounded-xl sm:rounded-2xl p-5 sm:p-8 hover-lift h-full flex flex-col">
                  <div className="flex gap-0.5 mb-3 sm:mb-4">
                    {[...Array(t.stars)].map((_, s) => (
                      <Star key={s} size={14} className="text-warning fill-warning" />
                    ))}
                  </div>
                  <p className="text-foreground leading-relaxed flex-1 mb-3 sm:mb-4 text-sm sm:text-base">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 6. OFERTA LIMITADA ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FadeInSection>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warning/10 text-warning text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <Zap size={13} /> Vagas limitadas
            </span>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold mb-4 sm:mb-6">
              Estamos abrindo novas contas{" "}
              <span className="text-gradient">por tempo limitado.</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto mb-8 sm:mb-10">
              Para manter qualidade no suporte e estabilidade da plataforma, estamos liberando apenas um número limitado de novos cadastros nesta fase.
            </p>
          </FadeInSection>
          <FadeInSection delay={0.2}>
            <CountdownTimer />
          </FadeInSection>
          <FadeInSection delay={0.3} className="mt-8 sm:mt-10">
            <Button
              onClick={goToSignup}
              size="lg"
              className="rounded-full text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/30"
            >
              🔥 Garantir minha vaga agora
            </Button>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════ 7. BÔNUS ══════════ */}
      <section className="py-12 sm:py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold text-center mb-3 sm:mb-4">
              Entrando agora <span className="text-gradient">você recebe:</span>
            </h2>
            <p className="text-center text-muted-foreground text-sm sm:text-base mb-8 sm:mb-12">Esses bônus podem sair do ar a qualquer momento.</p>
          </FadeInSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
            {bonuses.map((b, i) => (
              <FadeInSection key={i} delay={0.1 + i * 0.08}>
                <div className="glass-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover-lift glow-border group">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Gift size={18} className="text-primary sm:hidden" />
                      <Gift size={22} className="text-primary hidden sm:block" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs text-primary font-semibold mb-0.5 sm:mb-1">Bônus {i + 1}</p>
                      <h3 className="font-bold text-sm sm:text-base mb-0.5 sm:mb-1">{b.title}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 8. PLANOS ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl font-extrabold text-center mb-3 sm:mb-4">
              Você trabalha horas por{" "}
              <span className="text-gradient">R$120.</span>
            </h2>
            <p className="text-center text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-10">
              Perder esse valor por desorganização deveria doer mais do que investir em solução.
            </p>
          </FadeInSection>

          {/* Toggle */}
          <FadeInSection delay={0.1} className="flex justify-center mb-8 sm:mb-12">
            <div className="glass-card rounded-full p-1 flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensal
              </button>
              <button
                onClick={() => setBillingCycle("annual")}
                className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all ${billingCycle === "annual" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual <span className="text-[10px] sm:text-xs opacity-80">(economize)</span>
              </button>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 max-w-3xl mx-auto">
            {[
              {
                name: "Essencial",
                desc: "Para quem está começando a se organizar",
                price: billingCycle === "monthly" ? "49,90" : "41,66",
                priceLabel: billingCycle === "monthly" ? "/mês" : "/mês (cobrado anualmente)",
                annualTotal: billingCycle === "annual" ? "R$ 499,90/ano" : null,
                features: [
                  "100 agendamentos/mês",
                  "10 serviços",
                  "100 clientes",
                  "15 produtos em estoque",
                  "5 lembretes/dia via WhatsApp",
                  "Página pública padrão",
                  "Relatórios básicos",
                  "Controle financeiro",
                  "Caixa registradora",
                  "Chat de suporte",
                ],
                popular: false,
              },
              {
                name: "Enterprise",
                desc: "Tudo ilimitado para crescer de verdade",
                price: billingCycle === "monthly" ? "99,90" : "83,25",
                priceLabel: billingCycle === "monthly" ? "/mês" : "/mês (cobrado anualmente)",
                annualTotal: billingCycle === "annual" ? "R$ 999,00/ano" : null,
                features: [
                  "Agendamentos ilimitados",
                  "Serviços ilimitados",
                  "Clientes ilimitados",
                  "Produtos ilimitados",
                  "20 lembretes/dia via WhatsApp",
                  "3 campanhas/dia via WhatsApp",
                  "Página pública personalizada",
                  "Relatórios avançados",
                  "Cobrar sinal de agendamento",
                  "Cupons e promoções",
                  "Avaliações de clientes",
                  "Assistente IA",
                  "Até 5 profissionais inclusos",
                  "Integração Google Calendar",
                  "Suporte prioritário",
                ],
                popular: true,
              },
            ].map((plan, i) => (
              <FadeInSection key={i} delay={0.1 + i * 0.1}>
                <div className={`relative glass-card rounded-xl sm:rounded-2xl p-5 sm:p-8 hover-lift h-full flex flex-col ${plan.popular ? "glow-border" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 sm:px-4 py-1 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold shadow-lg whitespace-nowrap">
                        RECOMENDADO
                      </span>
                    </div>
                  )}
                  <h3 className="font-display text-lg sm:text-xl font-bold">{plan.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{plan.desc}</p>
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold">R$ {plan.price}</span>
                      <span className="text-muted-foreground text-xs sm:text-sm">{plan.priceLabel}</span>
                    </div>
                    {plan.annualTotal && (
                      <p className="text-xs text-primary mt-1">{plan.annualTotal}</p>
                    )}
                  </div>
                  <ul className="space-y-2 sm:space-y-3 flex-1 mb-4 sm:mb-6">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-2 text-xs sm:text-sm">
                        <Check size={14} className="text-success shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={goToSignup}
                    className={`w-full rounded-full h-11 sm:h-12 font-semibold text-sm ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
                  >
                    Começar agora
                  </Button>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ 9. GARANTIA ══════════ */}
      <section className="py-12 sm:py-28 px-4">
        <FadeInSection>
          <div className="max-w-2xl mx-auto text-center glass-card rounded-2xl sm:rounded-3xl p-6 sm:p-12 glow-border">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Shield size={24} className="text-success sm:hidden" />
              <Shield size={32} className="text-success hidden sm:block" />
            </div>
            <h2 className="font-display text-xl sm:text-3xl font-bold mb-3 sm:mb-4">
              Teste grátis. Sem cartão. Sem risco.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg">
              Se não fizer sentido para você, basta cancelar. Sem letras miúdas, sem pegadinhas.
            </p>
          </div>
        </FadeInSection>
      </section>

      {/* ══════════ 10. CTA FINAL ══════════ */}
      <section className="py-12 sm:py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.04] to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <FadeInSection>
            <h2 className="font-display text-2xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4 sm:mb-6">
              Daqui a 6 meses você pode estar <span className="text-gradient">organizado</span>.
              <br className="hidden sm:block" />
              <span className="sm:hidden"> </span>Ou no mesmo lugar.
            </h2>
          </FadeInSection>
          <FadeInSection delay={0.1}>
            <p className="text-base sm:text-xl text-muted-foreground mb-6 sm:mb-10">A decisão começa agora.</p>
          </FadeInSection>
          <FadeInSection delay={0.2}>
            <Button
              onClick={goToSignup}
              size="lg"
              className="relative rounded-full text-sm sm:text-lg px-6 sm:px-10 py-5 sm:py-7 h-auto font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xl shadow-primary/30 group"
            >
              <span className="absolute inset-0 rounded-full animate-pulse bg-primary/20" />
              <span className="relative flex items-center gap-2">
                🔥 Criar minha conta gratuita agora
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </span>
            </Button>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">Leva menos de 2 minutos.</p>
          </FadeInSection>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-border/40 py-6 sm:py-10 px-4 pb-20 sm:pb-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Logo" className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
            <span className="font-display font-bold text-sm">Gende</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">© {new Date().getFullYear()} Gende. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ══════════ FIXED MOBILE CTA ══════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-2.5 sm:hidden bg-background/80 backdrop-blur-2xl border-t border-border/40 safe-area-bottom">
        <Button
          onClick={goToSignup}
          className="w-full rounded-full py-3.5 h-auto font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/30 text-sm"
        >
          🔥 Criar conta grátis
        </Button>
      </div>
    </div>
  );
};

export default Landing;
