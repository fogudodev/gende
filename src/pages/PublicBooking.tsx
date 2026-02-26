import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock,
  DollarSign,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  User,
  Phone,
  Sparkles,
  CalendarDays,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Professional = {
  id: string;
  name: string;
  business_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  slug: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
};

type Slot = {
  start_time: string;
  end_time: string;
};

const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0); // 0=service, 1=date/time, 2=form, 3=success
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfessional = async () => {
      if (!slug) return;
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, business_name, bio, avatar_url, logo_url, primary_color, slug")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfessional(data);

      const { data: svc } = await supabase
        .from("services")
        .select("*")
        .eq("professional_id", data.id)
        .eq("active", true)
        .order("sort_order", { ascending: true });

      setServices(svc || []);
      setLoading(false);
    };
    fetchProfessional();
  }, [slug]);

  useEffect(() => {
    if (!selectedDate || !selectedService || !professional) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      const { data, error } = await supabase.rpc("get_available_slots", {
        p_professional_id: professional.id,
        p_service_id: selectedService.id,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });
      if (!error && data && typeof data === "object" && "success" in (data as any)) {
        const result = data as any;
        if (result.success) {
          setSlots(result.slots || []);
        } else {
          setSlots([]);
        }
      } else {
        setSlots([]);
      }
      setLoadingSlots(false);
    };
    fetchSlots();
  }, [selectedDate, selectedService, professional]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professional || !selectedService || !selectedSlot) return;

    if (clientName.trim().length < 2) {
      toast.error("Informe seu nome completo");
      return;
    }
    const phoneClean = clientPhone.replace(/\D/g, "");
    if (phoneClean.length < 10) {
      toast.error("Informe um telefone válido com DDD");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_public_booking", {
      p_professional_id: professional.id,
      p_service_id: selectedService.id,
      p_start_time: selectedSlot.start_time,
      p_client_name: clientName.trim(),
      p_client_phone: phoneClean,
    });

    if (error) {
      toast.error("Erro ao agendar. Tente novamente.");
      setSubmitting(false);
      return;
    }

    const result = data as any;
    if (result?.success) {
      setStep(3);
    } else {
      toast.error(result?.error || "Erro ao agendar");
    }
    setSubmitting(false);
  };

  const accentColor = professional?.primary_color || "#C4922A";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (notFound || !professional) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Página não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const groupedServices = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const stepTitles = ["Escolha o serviço", "Data e horário", "Seus dados", "Agendado!"];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary">
        <div className="max-w-2xl mx-auto px-6 py-8 text-center">
          {professional.logo_url ? (
            <img src={professional.logo_url} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg" />
          ) : (
            <div
              className="w-16 h-16 rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center text-2xl font-bold"
              style={{ background: accentColor, color: "#fff" }}
            >
              {(professional.business_name || professional.name)?.[0]?.toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
            {professional.business_name || professional.name}
          </h1>
          {professional.bio && (
            <p className="text-sm text-primary-foreground/60 mt-2 max-w-md mx-auto">{professional.bio}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      {step < 3 && (
        <div className="max-w-2xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-2 mb-1">
            {[0, 1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  s <= step ? "bg-accent" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Passo {step + 1} de 3 — {stepTitles[step]}
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Service Selection */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Sparkles size={18} className="text-accent" />
                Escolha o serviço
              </h2>

              {Object.entries(groupedServices).map(([category, svcs]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    {category}
                  </p>
                  <div className="space-y-3">
                    {svcs.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedService(s);
                          setStep(1);
                          setSelectedDate(undefined);
                          setSelectedSlot(null);
                        }}
                        className={cn(
                          "w-full glass-card rounded-2xl p-5 text-left hover-lift transition-all group"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground group-hover:text-accent transition-colors">
                              {s.name}
                            </h3>
                            {s.description && (
                              <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-3">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={12} />
                                {s.duration_minutes} min
                              </span>
                              <span className="flex items-center gap-1 text-sm font-semibold text-accent">
                                <DollarSign size={14} />
                                {Number(s.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={18} className="text-muted-foreground group-hover:text-accent transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {services.length === 0 && (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 1: Date & Time */}
          {step === 1 && selectedService && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep(0)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

              {/* Selected service summary */}
              <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{selectedService.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedService.duration_minutes} min •{" "}
                    {Number(selectedService.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <CalendarDays size={18} className="text-accent" />
                Escolha a data
              </h2>

              <div className="glass-card rounded-2xl p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </div>

              {selectedDate && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Horários disponíveis — {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </h3>

                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-accent" />
                    </div>
                  ) : slots.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slots.map((slot) => {
                        const time = format(new Date(slot.start_time), "HH:mm");
                        const isSelected = selectedSlot?.start_time === slot.start_time;
                        return (
                          <button
                            key={slot.start_time}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "py-2.5 rounded-xl text-sm font-medium transition-all",
                              isSelected
                                ? "gradient-accent text-accent-foreground shadow-lg"
                                : "glass-card hover:border-accent/30 text-foreground"
                            )}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="glass-card rounded-2xl p-6 text-center">
                      <p className="text-muted-foreground text-sm">Nenhum horário disponível nesta data.</p>
                    </div>
                  )}

                  {selectedSlot && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                      <button
                        onClick={() => setStep(2)}
                        className="w-full py-3 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover-lift"
                      >
                        Continuar
                        <ArrowRight size={16} />
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Client form */}
          {step === 2 && selectedService && selectedSlot && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

              {/* Summary */}
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Resumo do agendamento</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Serviço</span>
                    <span className="font-medium text-foreground">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(selectedSlot.start_time), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horário</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(selectedSlot.start_time), "HH:mm")} -{" "}
                      {format(new Date(selectedSlot.end_time), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Valor</span>
                    <span className="font-semibold text-accent">
                      {Number(selectedService.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <User size={18} className="text-accent" />
                Seus dados
              </h2>

              <form onSubmit={handleBook} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Seu nome"
                      required
                      maxLength={100}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone (WhatsApp)</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      required
                      maxLength={20}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 rounded-xl gradient-accent text-accent-foreground font-semibold text-sm flex items-center justify-center gap-2 hover-lift disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Confirmar agendamento
                      <CheckCircle2 size={16} />
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {/* Step 3: Success */}
          {step === 3 && selectedService && selectedSlot && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10 space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full gradient-accent mx-auto flex items-center justify-center shadow-xl"
              >
                <CheckCircle2 size={36} className="text-accent-foreground" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Agendamento confirmado!</h2>
                <p className="text-muted-foreground">
                  Você receberá uma confirmação por WhatsApp.
                </p>
              </div>

              <div className="glass-card rounded-2xl p-5 text-left space-y-2 text-sm max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium text-foreground">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(selectedSlot.start_time), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(selectedSlot.start_time), "HH:mm")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setStep(0);
                  setSelectedService(null);
                  setSelectedDate(undefined);
                  setSelectedSlot(null);
                  setClientName("");
                  setClientPhone("");
                }}
                className="text-sm text-accent font-semibold hover:underline"
              >
                Fazer outro agendamento
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicBooking;
