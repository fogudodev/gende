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
  Users,
  QrCode,
  Copy,
  Check,
  Star,
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
  account_type: "autonomous" | "salon";
};

type Employee = {
  id: string;
  name: string;
  specialty: string | null;
  avatar_url: string | null;
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

type PaymentConfig = {
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary_name: string | null;
  signal_enabled: boolean;
  signal_type: string;
  signal_value: number;
  accept_pix: boolean;
};

const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const isSalon = professional?.account_type === "salon";
  // Steps: salon = 0:employee, 1:service, 2:date, 3:form, 4:success
  // autonomous = 0:service, 1:date, 2:form, 3:success
  const totalSteps = isSalon ? 5 : 4;
  const stepOffset = isSalon ? 0 : -1; // maps logical step

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      const { data: prof, error } = await supabase
        .from("professionals")
        .select("id, name, business_name, bio, avatar_url, logo_url, primary_color, slug, account_type")
        .eq("slug", slug)
        .single();

      if (error || !prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfessional(prof);

      // Fetch services, employees, and payment config in parallel
      const [svcRes, empRes, payRes] = await Promise.all([
        supabase
          .from("services")
          .select("*")
          .eq("professional_id", prof.id)
          .eq("active", true)
          .order("sort_order", { ascending: true }),
        prof.account_type === "salon"
          ? supabase
              .from("salon_employees")
              .select("id, name, specialty, avatar_url")
              .eq("salon_id", prof.id)
              .eq("is_active", true)
              .order("name")
          : Promise.resolve({ data: [] }),
        supabase
          .from("payment_config")
          .select("pix_key, pix_key_type, pix_beneficiary_name, signal_enabled, signal_type, signal_value, accept_pix")
          .eq("professional_id", prof.id)
          .maybeSingle(),
      ]);

      setServices(svcRes.data || []);
      setEmployees(empRes.data || []);
      setPaymentConfig(payRes.data || null);
      setLoading(false);

      // If autonomous, start at service step
      if (prof.account_type !== "salon") {
        setStep(0);
      }
    };
    fetchData();
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
        setSlots(result.success ? result.slots || [] : []);
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
      // If salon and employee selected, update the booking with employee_id
      if (isSalon && selectedEmployee) {
        await supabase
          .from("bookings")
          .update({ employee_id: selectedEmployee.id })
          .eq("id", result.booking_id);
      }
      setBookingId(result.booking_id);
      setStep(isSalon ? 4 : 3);
    } else {
      toast.error(result?.error || "Erro ao agendar");
    }
    setSubmitting(false);
  };

  const copyPixKey = () => {
    if (paymentConfig?.pix_key) {
      navigator.clipboard.writeText(paymentConfig.pix_key);
      setPixCopied(true);
      toast.success("Chave PIX copiada!");
      setTimeout(() => setPixCopied(false), 3000);
    }
  };

  const handleSubmitReview = async () => {
    if (!professional || reviewSubmitted) return;
    setSubmittingReview(true);
    const { error } = await supabase.from("reviews").insert({
      professional_id: professional.id,
      booking_id: bookingId,
      employee_id: selectedEmployee?.id || null,
      client_name: clientName.trim(),
      client_phone: clientPhone.replace(/\D/g, ""),
      rating: reviewRating,
      comment: reviewComment.trim() || null,
    });
    if (!error) {
      setReviewSubmitted(true);
      toast.success("Avaliação enviada! Obrigado.");
    } else {
      toast.error("Erro ao enviar avaliação");
    }
    setSubmittingReview(false);
  };

  const getSignalAmount = () => {
    if (!paymentConfig?.signal_enabled || !selectedService) return null;
    if (paymentConfig.signal_type === "percentage") {
      return (Number(selectedService.price) * paymentConfig.signal_value) / 100;
    }
    return paymentConfig.signal_value;
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

  // Determine current logical step for progress bar
  const successStep = isSalon ? 4 : 3;
  const formStep = isSalon ? 3 : 2;
  const dateStep = isSalon ? 2 : 1;
  const serviceStep = isSalon ? 1 : 0;
  const employeeStep = 0; // salon only

  const progressSteps = isSalon ? 4 : 3; // exclude success
  const currentProgress = step;

  const stepLabels = isSalon
    ? ["Profissional", "Serviço", "Data e horário", "Confirmação", "Agendado!"]
    : ["Serviço", "Data e horário", "Confirmação", "Agendado!"];

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
      {step < successStep && (
        <div className="max-w-2xl mx-auto px-6 pt-6">
          <div className="flex items-center gap-2 mb-1">
            {Array.from({ length: progressSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  i <= step ? "bg-accent" : "bg-muted"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Passo {step + 1} de {progressSteps} — {stepLabels[step]}
          </p>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          {/* Step 0 (Salon): Employee Selection */}
          {isSalon && step === employeeStep && (
            <motion.div
              key="step-employee"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Users size={18} className="text-accent" />
                Escolha o profissional
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    onClick={() => {
                      setSelectedEmployee(emp);
                      setStep(serviceStep);
                    }}
                    className="glass-card rounded-2xl p-5 text-center hover-lift transition-all group"
                  >
                    {emp.avatar_url ? (
                      <img
                        src={emp.avatar_url}
                        alt={emp.name}
                        className="w-16 h-16 rounded-full mx-auto mb-3 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 bg-accent/10 flex items-center justify-center">
                        <User size={24} className="text-accent" />
                      </div>
                    )}
                    <h3 className="font-semibold text-foreground text-sm group-hover:text-accent transition-colors">
                      {emp.name}
                    </h3>
                    {emp.specialty && (
                      <p className="text-xs text-muted-foreground mt-1">{emp.specialty}</p>
                    )}
                  </button>
                ))}
              </div>

              {employees.length === 0 && (
                <div className="glass-card rounded-2xl p-8 text-center">
                  <p className="text-muted-foreground">Nenhum profissional disponível no momento.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* Service Selection */}
          {step === serviceStep && (
            <motion.div
              key="step-service"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {isSalon && (
                <button
                  onClick={() => setStep(employeeStep)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft size={14} />
                  Voltar
                </button>
              )}

              {/* Selected employee summary (salon) */}
              {isSalon && selectedEmployee && (
                <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <User size={16} className="text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">{selectedEmployee.name}</p>
                    {selectedEmployee.specialty && (
                      <p className="text-xs text-muted-foreground">{selectedEmployee.specialty}</p>
                    )}
                  </div>
                </div>
              )}

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
                          setStep(dateStep);
                          setSelectedDate(undefined);
                          setSelectedSlot(null);
                        }}
                        className="w-full glass-card rounded-2xl p-5 text-left hover-lift transition-all group"
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

          {/* Date & Time */}
          {step === dateStep && selectedService && (
            <motion.div
              key="step-date"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep(serviceStep)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

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
                        onClick={() => setStep(formStep)}
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

          {/* Form + PIX */}
          {step === formStep && selectedService && selectedSlot && (
            <motion.div
              key="step-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button
                onClick={() => setStep(dateStep)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>

              {/* Summary */}
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="font-semibold text-foreground text-sm">Resumo do agendamento</h3>
                <div className="space-y-2 text-sm">
                  {isSalon && selectedEmployee && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profissional</span>
                      <span className="font-medium text-foreground">{selectedEmployee.name}</span>
                    </div>
                  )}
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
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="font-semibold text-accent">
                      {Number(selectedService.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                  {getSignalAmount() && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sinal (reserva)</span>
                      <span className="font-semibold text-accent">
                        {getSignalAmount()!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* PIX Payment Info */}
              {paymentConfig?.accept_pix && paymentConfig?.pix_key && paymentConfig?.signal_enabled && getSignalAmount() && (
                <div className="glass-card rounded-2xl p-5 space-y-4 border-accent/20 border">
                  <div className="flex items-center gap-2">
                    <QrCode size={18} className="text-accent" />
                    <h3 className="font-semibold text-foreground text-sm">Pagamento do Sinal via PIX</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Para confirmar seu agendamento, envie o sinal de{" "}
                    <span className="font-semibold text-accent">
                      {getSignalAmount()!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>{" "}
                    via PIX.
                  </p>
                  <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className="font-medium text-foreground capitalize">
                        {paymentConfig.pix_key_type || "Chave"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Chave</span>
                      <span className="font-medium text-foreground font-mono text-xs">
                        {paymentConfig.pix_key}
                      </span>
                    </div>
                    {paymentConfig.pix_beneficiary_name && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Favorecido</span>
                        <span className="font-medium text-foreground">{paymentConfig.pix_beneficiary_name}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={copyPixKey}
                    className="w-full py-2.5 rounded-xl border border-accent/30 text-accent font-medium text-sm flex items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                  >
                    {pixCopied ? <Check size={14} /> : <Copy size={14} />}
                    {pixCopied ? "Copiada!" : "Copiar chave PIX"}
                  </button>
                </div>
              )}

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

          {/* Success */}
          {step === successStep && selectedService && selectedSlot && (
            <motion.div
              key="step-success"
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
                {isSalon && selectedEmployee && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profissional</span>
                    <span className="font-medium text-foreground">{selectedEmployee.name}</span>
                  </div>
                )}
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

              {/* PIX reminder on success */}
              {paymentConfig?.accept_pix && paymentConfig?.pix_key && paymentConfig?.signal_enabled && getSignalAmount() && (
                <div className="glass-card rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto border border-accent/20">
                  <div className="flex items-center gap-2">
                    <QrCode size={16} className="text-accent" />
                    <p className="text-sm font-semibold text-foreground">Não esqueça o sinal!</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Envie{" "}
                    <span className="font-semibold text-accent">
                      {getSignalAmount()!.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>{" "}
                    via PIX para confirmar sua reserva.
                  </p>
                  <button
                    onClick={copyPixKey}
                    className="w-full py-2 rounded-xl border border-accent/30 text-accent font-medium text-xs flex items-center justify-center gap-2 hover:bg-accent/5 transition-colors"
                  >
                    {pixCopied ? <Check size={12} /> : <Copy size={12} />}
                    {pixCopied ? "Copiada!" : `Copiar chave: ${paymentConfig.pix_key}`}
                  </button>
                </div>
              )}

              {/* Review Form */}
              {!reviewSubmitted ? (
                <div className="glass-card rounded-2xl p-5 text-left space-y-4 max-w-sm mx-auto">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                    <Star size={16} className="text-warning" />
                    Como foi sua experiência?
                  </h3>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button
                        key={s}
                        onClick={() => setReviewRating(s)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          size={28}
                          className={cn(
                            "transition-colors",
                            s <= reviewRating ? "text-warning fill-warning" : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Conte como foi (opcional)"
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                  />
                  <button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="w-full py-2.5 rounded-xl gradient-accent text-accent-foreground font-medium text-sm flex items-center justify-center gap-2 hover-lift disabled:opacity-50"
                  >
                    {submittingReview ? <Loader2 size={14} className="animate-spin" /> : "Enviar avaliação"}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-success font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Obrigado pela avaliação!
                </p>
              )}

              <button
                onClick={() => {
                  setStep(isSalon ? employeeStep : serviceStep);
                  setSelectedEmployee(null);
                  setSelectedService(null);
                  setSelectedDate(undefined);
                  setSelectedSlot(null);
                  setClientName("");
                  setClientPhone("");
                  setReviewRating(5);
                  setReviewComment("");
                  setReviewSubmitted(false);
                  setBookingId(null);
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
