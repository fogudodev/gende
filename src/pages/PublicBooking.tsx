import { useState, useEffect, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────── */
type Professional = {
  id: string;
  name: string;
  business_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  logo_url: string | null;
  cover_url: string | null;
  primary_color: string | null;
  bg_color: string | null;
  text_color: string | null;
  component_color: string | null;
  slug: string | null;
  account_type: "autonomous" | "salon";
  welcome_title: string | null;
  welcome_description: string | null;
  welcome_message: string | null;
  confirmation_message: string | null;
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

type Slot = { start_time: string; end_time: string };

type PaymentConfig = {
  pix_key: string | null;
  pix_key_type: string | null;
  pix_beneficiary_name: string | null;
  signal_enabled: boolean;
  signal_type: string;
  signal_value: number;
  accept_pix: boolean;
};

/* ── Helpers ───────────────────────────────────── */
const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAYS_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ── Main Component ────────────────────────────── */
const PublicBooking = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();

  // Data
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Wizard
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [animating, setAnimating] = useState(false);

  // Selections
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Review
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  const isSalon = professional?.account_type === "salon";
  const totalSteps = isSalon ? 5 : 4;
  const accent = professional?.primary_color || "#7C3AED";
  const accentLight = accent + "1a";
  const accentBorder = accent + "33";

  /* Steps mapping:
     Salon:      1=client, 2=employee, 3=service, 4=date, 5=confirm
     Autonomous: 1=client, 2=service, 3=date, 4=confirm */
  const serviceStep = isSalon ? 3 : 2;
  const dateStep = isSalon ? 4 : 3;
  const confirmStep = isSalon ? 5 : 4;

  const goNext = () => {
    if (animating) return;
    setDirection("forward");
    setAnimating(true);
    setTimeout(() => { setStep(s => Math.min(s + 1, confirmStep + 1)); setAnimating(false); }, 50);
  };
  const goBack = () => {
    if (animating || step === 1) return;
    setDirection("backward");
    setAnimating(true);
    setTimeout(() => { setStep(s => Math.max(s - 1, 1)); setAnimating(false); }, 50);
  };

  const animClass = direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";

  /* ── Data Fetching ── */
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      const { data: prof, error } = await supabase
        .from("professionals")
        .select("id, name, business_name, bio, avatar_url, logo_url, cover_url, primary_color, bg_color, text_color, component_color, slug, account_type, welcome_title, welcome_description, welcome_message, confirmation_message")
        .eq("slug", slug)
        .single();

      if (error || !prof) { setNotFound(true); setLoading(false); return; }
      setProfessional(prof);

      const [svcRes, empRes, payRes] = await Promise.all([
        supabase.from("services").select("*").eq("professional_id", prof.id).eq("active", true).order("sort_order", { ascending: true }),
        prof.account_type === "salon"
          ? supabase.from("salon_employees").select("id, name, specialty, avatar_url").eq("salon_id", prof.id).eq("is_active", true).order("name")
          : Promise.resolve({ data: [] }),
        supabase.from("payment_config").select("pix_key, pix_key_type, pix_beneficiary_name, signal_enabled, signal_type, signal_value, accept_pix").eq("professional_id", prof.id).maybeSingle(),
      ]);
      setServices(svcRes.data || []);
      setEmployees(empRes.data || []);
      setPaymentConfig(payRes.data || null);
      setLoading(false);
    };
    fetchData();
  }, [slug]);

  // Review link handler
  useEffect(() => {
    if (!professional) return;
    const isReview = searchParams.get("review") === "true";
    const reviewBookingId = searchParams.get("booking");
    if (isReview && reviewBookingId) {
      setBookingId(reviewBookingId);
      setConfirmed(true);
      setStep(confirmStep);
      (async () => {
        const { data: booking } = await supabase.from("bookings").select("client_name, client_phone, employee_id").eq("id", reviewBookingId).single();
        if (booking) {
          setClientName(booking.client_name || "Cliente");
          setClientPhone(booking.client_phone || "");
          if (booking.employee_id && employees.length > 0) {
            const emp = employees.find(e => e.id === booking.employee_id);
            if (emp) setSelectedEmployee(emp);
          }
        }
      })();
    }
  }, [professional, employees, searchParams]);

  /* ── Fetch Slots ── */
  useEffect(() => {
    if (!selectedDate || !selectedService || !professional) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      setSelectedSlot(null);
      setSelectedTime("");
      const { data } = await supabase.rpc("get_available_slots", {
        p_professional_id: professional.id,
        p_service_id: selectedService.id,
        p_date: format(selectedDate, "yyyy-MM-dd"),
      });
      if (data && typeof data === "object" && "success" in (data as any)) {
        const result = data as any;
        setSlots(result.success ? result.slots || [] : []);
      } else {
        setSlots([]);
      }
      setLoadingSlots(false);
    };
    fetchSlots();
  }, [selectedDate, selectedService, professional]);

  /* ── Booking Submission ── */
  const handleBook = async () => {
    if (!professional || !selectedService || !selectedSlot) return;
    if (clientName.trim().length < 2) { toast.error("Informe seu nome completo"); return; }
    const phoneClean = clientPhone.replace(/\D/g, "");
    if (phoneClean.length < 10) { toast.error("Informe um telefone válido com DDD"); return; }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_public_booking", {
      p_professional_id: professional.id,
      p_service_id: selectedService.id,
      p_start_time: selectedSlot.start_time,
      p_client_name: clientName.trim(),
      p_client_phone: phoneClean,
    });
    if (error) { toast.error("Erro ao agendar. Tente novamente."); setSubmitting(false); return; }
    const result = data as any;
    if (result?.success) {
      if (isSalon && selectedEmployee) {
        await supabase.from("bookings").update({ employee_id: selectedEmployee.id }).eq("id", result.booking_id);
      }
      setBookingId(result.booking_id);
      // If signal payment, show modal; otherwise confirm directly
      if (paymentConfig?.signal_enabled && paymentConfig?.accept_pix && paymentConfig?.pix_key && getSignalAmount()) {
        setShowPaymentModal(true);
      } else {
        setConfirmed(true);
      }
    } else {
      toast.error(result?.error || "Erro ao agendar");
    }
    setSubmitting(false);
  };

  const getSignalAmount = () => {
    if (!paymentConfig?.signal_enabled || !selectedService) return null;
    if (paymentConfig.signal_type === "percentage") return (Number(selectedService.price) * paymentConfig.signal_value) / 100;
    return paymentConfig.signal_value;
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
    if (!error) { setReviewSubmitted(true); toast.success("Avaliação enviada! Obrigado."); }
    else toast.error("Erro ao enviar avaliação");
    setSubmittingReview(false);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedEmployee(null);
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedTime("");
    setSelectedSlot(null);
    setClientName("");
    setClientPhone("");
    setConfirmed(false);
    setBookingId(null);
    setShowPaymentModal(false);
    setReviewRating(5);
    setReviewComment("");
    setReviewSubmitted(false);
  };

  // Generate 14 days for date picker
  const today = useMemo(() => new Date(), []);
  const days14 = useMemo(() => Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() + i); return d; }), [today]);

  const groupedServices = services.reduce<Record<string, Service[]>>((acc, s) => {
    const cat = s.category || "Geral";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  /* ── Loading / Not Found ── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F5FF" }}>
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#7C3AED" }} />
    </div>
  );
  if (notFound || !professional) return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8F5FF" }}>
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#1F1535" }}>Página não encontrada</h1>
        <p style={{ color: "#6B7280" }}>Verifique o link e tente novamente.</p>
      </div>
    </div>
  );

  const signalAmount = getSignalAmount();
  const totalPrice = selectedService ? Number(selectedService.price) : 0;
  const remainingValue = signalAmount ? totalPrice - signalAmount : totalPrice;

  /* ═══════════════════════════════════════════════ */
  /* ══ RENDER ═════════════════════════════════════ */
  /* ═══════════════════════════════════════════════ */
  return (
    <div className="phone-frame" style={{ background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 50%, ${accent}12 100%)`, fontFamily: "'Poppins', sans-serif" }}>
      {/* Desktop decorations */}
      <div className="hidden md:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 70%)` }} />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-30" style={{ background: `radial-gradient(circle, ${accent}99 0%, transparent 70%)` }} />
        {/* Desktop branding */}
        <div className="absolute top-8 left-8">
          <div className="flex items-center gap-2">
            {professional.logo_url ? (
              <img src={professional.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
                {(professional.business_name || professional.name)?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-bold text-sm" style={{ color: "#1F1535" }}>{professional.business_name || professional.name}</p>
              {professional.bio && <p className="text-xs" style={{ color: "#9CA3AF" }}>{professional.bio.slice(0, 40)}</p>}
            </div>
          </div>
        </div>
        {/* Steps indicator desktop */}
        <div className="absolute bottom-8 left-8 space-y-2">
          {(isSalon
            ? [{ n: 1, label: "Seus dados" }, { n: 2, label: "Profissional" }, { n: 3, label: "Serviço" }, { n: 4, label: "Data & Hora" }, { n: 5, label: "Confirmação" }]
            : [{ n: 1, label: "Seus dados" }, { n: 2, label: "Serviço" }, { n: 3, label: "Data & Hora" }, { n: 4, label: "Confirmação" }]
          ).map(s => (
            <div key={s.n} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>{s.n}</div>
              <span className="text-xs font-medium" style={{ color: "#6B7280" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="phone-screen" style={{ background: professional.bg_color || "#F8F5FF" }}>
        {/* Progress bar */}
        {!confirmed && (
          <div className="sticky top-0 z-50 px-5 pt-4 pb-2" style={{ background: `${professional.bg_color || "#F8F5FF"}cc`, backdropFilter: "blur(8px)" }}>
            <div className="flex gap-1.5 mb-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500" style={{ background: i + 1 <= step ? accent : `${accent}30`, opacity: i + 1 < step ? 0.6 : 1 }} />
              ))}
            </div>
            <p className="text-xs font-medium" style={{ color: "#9CA3AF" }}>Etapa {step} de {totalSteps}</p>
          </div>
        )}

        {/* Step content */}
        <div key={step} className={confirmed ? "" : animClass}>
          {/* ═══ STEP 1: Client Info ═══ */}
          {step === 1 && !confirmed && (
            <Step1ClientInfo
              professional={professional}
              accent={accent}
              clientName={clientName}
              setClientName={setClientName}
              clientPhone={clientPhone}
              setClientPhone={setClientPhone}
              onNext={goNext}
            />
          )}

          {/* ═══ STEP 2 (Salon): Employee Selection ═══ */}
          {isSalon && step === 2 && !confirmed && (
            <Step2Employees
              employees={employees}
              selected={selectedEmployee}
              clientName={clientName}
              accent={accent}
              onSelect={(emp) => { setSelectedEmployee(emp); goNext(); }}
              onBack={goBack}
            />
          )}

          {/* ═══ Service Selection ═══ */}
          {step === serviceStep && !confirmed && (
            <Step3Services
              services={services}
              groupedServices={groupedServices}
              selected={selectedService}
              selectedEmployee={selectedEmployee}
              accent={accent}
              isSalon={isSalon}
              onSelect={(svc) => { setSelectedService(svc); setSelectedDate(null); setSelectedSlot(null); setSelectedTime(""); goNext(); }}
              onBack={goBack}
            />
          )}

          {/* ═══ Date & Time ═══ */}
          {step === dateStep && selectedService && !confirmed && (
            <Step4DateTime
              service={selectedService}
              accent={accent}
              days={days14}
              today={today}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              slots={slots}
              loadingSlots={loadingSlots}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              onNext={goNext}
              onBack={goBack}
            />
          )}

          {/* ═══ Confirmation ═══ */}
          {step === confirmStep && selectedService && !confirmed && (
            <Step5Confirm
              professional={professional}
              selectedEmployee={selectedEmployee}
              selectedService={selectedService}
              selectedSlot={selectedSlot}
              clientName={clientName}
              clientPhone={clientPhone}
              accent={accent}
              isSalon={isSalon}
              paymentConfig={paymentConfig}
              signalAmount={signalAmount}
              totalPrice={totalPrice}
              remainingValue={remainingValue}
              submitting={submitting}
              onConfirm={handleBook}
              onBack={goBack}
            />
          )}

          {/* ═══ Success / Confirmed ═══ */}
          {confirmed && (
            <SuccessView
              professional={professional}
              selectedEmployee={selectedEmployee}
              selectedService={selectedService}
              selectedSlot={selectedSlot}
              clientName={clientName}
              clientPhone={clientPhone}
              accent={accent}
              signalAmount={signalAmount}
              paymentConfig={paymentConfig}
              reviewRating={reviewRating}
              setReviewRating={setReviewRating}
              reviewComment={reviewComment}
              setReviewComment={setReviewComment}
              reviewSubmitted={reviewSubmitted}
              submittingReview={submittingReview}
              onSubmitReview={handleSubmitReview}
              onReset={handleReset}
            />
          )}
        </div>
      </div>

      {/* ═══ Payment Modal ═══ */}
      {showPaymentModal && paymentConfig && signalAmount && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={(e) => { if (e.target === e.currentTarget) setShowPaymentModal(false); }}>
          <div className="w-full max-w-sm mx-auto animate-fade-in-up-bloom overflow-y-auto" style={{ background: "white", borderRadius: "2rem 2rem 0 0", maxHeight: "90vh", paddingBottom: "env(safe-area-inset-bottom, 16px)" }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full" style={{ background: "#E5E7EB" }} /></div>
            <div className="px-5 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: "#1F1535" }}>Pagamento via PIX</h3>
                <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "#F3F4F6", color: "#6B7280" }}>✕</button>
              </div>
              <div className="rounded-2xl p-4 mb-4" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
                <div className="space-y-2">
                  <div className="flex justify-between"><span className="text-xs" style={{ color: "#6B7280" }}>Serviço completo</span><span className="text-sm font-bold" style={{ color: "#1F1535" }}>{formatCurrency(totalPrice)}</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-semibold" style={{ color: accent }}>Sinal a pagar agora (PIX)</span><span className="text-lg font-bold" style={{ color: accent }}>{formatCurrency(signalAmount)}</span></div>
                  <div className="h-px" style={{ background: `${accent}30` }} />
                  <div className="flex justify-between"><span className="text-xs" style={{ color: "#6B7280" }}>Restante no local</span><span className="text-sm font-semibold" style={{ color: "#374151" }}>{formatCurrency(remainingValue)}</span></div>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-xs font-semibold mb-2" style={{ color: "#6B7280" }}>Chave PIX ({paymentConfig.pix_key_type || "Chave"}):</p>
                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                  <p className="text-xs flex-1 truncate font-mono" style={{ color: "#374151" }}>{paymentConfig.pix_key}</p>
                  <button onClick={copyPixKey} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 text-white" style={{ background: pixCopied ? "#10B981" : accent }}>{pixCopied ? "✓ Copiado!" : "Copiar"}</button>
                </div>
                {paymentConfig.pix_beneficiary_name && <p className="text-xs mt-2 font-medium" style={{ color: accent }}>{paymentConfig.pix_beneficiary_name}</p>}
              </div>
              <button onClick={() => { setShowPaymentModal(false); setConfirmed(true); }} className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95" style={{ background: "linear-gradient(135deg, #059669 0%, #10B981 100%)", boxShadow: "0 8px 24px rgba(5,150,105,0.35)" }}>
                ✅ Já realizei o pagamento
              </button>
              <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>Após o pagamento, você receberá confirmação no WhatsApp</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════ */
/* ══ SUB-COMPONENTS ════════════════════════════════ */
/* ═══════════════════════════════════════════════════ */

/* ── Step 1: Client Info ── */
function Step1ClientInfo({ professional, accent, clientName, setClientName, clientPhone, setClientPhone, onNext }: {
  professional: Professional; accent: string; clientName: string; setClientName: (v: string) => void; clientPhone: string; setClientPhone: (v: string) => void; onNext: () => void;
}) {
  const [errors, setErrors] = useState({ name: "", phone: "" });
  const validate = () => {
    const e = { name: "", phone: "" };
    if (!clientName.trim() || clientName.trim().length < 3) e.name = "Informe seu nome completo";
    if (clientPhone.replace(/\D/g, "").length < 10) e.phone = "Informe um WhatsApp válido";
    setErrors(e);
    return !e.name && !e.phone;
  };
  const handleNext = () => { if (validate()) onNext(); };

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-[calc(860px-60px)]">
      {/* Hero */}
      <div className="relative h-52 overflow-hidden">
        {professional.cover_url ? (
          <img src={professional.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }} />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${accent}80 0%, ${accent}33 50%, ${professional.bg_color || "#F8F5FF"} 100%)` }} />
        <div className="absolute bottom-4 left-5 right-5">
          <div className="flex items-center gap-2">
            {professional.logo_url ? (
              <img src={professional.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: accent }}>
                {(professional.business_name || professional.name)?.[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-white font-bold text-lg drop-shadow">{professional.business_name || professional.name}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 px-5 pt-6 pb-8 flex flex-col">
        <div className="animate-fade-in-up-bloom">
          <h1 className="text-2xl font-bold mb-1" style={{ color: professional.text_color || "#1F1535" }}>
            {professional.welcome_title || "Bem-vindo! 👋"}
          </h1>
          <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
            {professional.welcome_description || "Agende seu horário em poucos passos. Primeiro, nos conte quem é você."}
          </p>

          {/* Name */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>Seu nome</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">👤</span>
              <input type="text" placeholder="Ex: Maria Silva" value={clientName}
                onChange={e => { setClientName(e.target.value); if (errors.name) setErrors({...errors, name: ""}); }}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all outline-none"
                style={{ background: errors.name ? "#FFF1F2" : `${accent}10`, border: `2px solid ${errors.name ? "#F87171" : clientName ? accent : `${accent}30`}`, color: "#1F1535" }}
              />
            </div>
            {errors.name && <p className="text-xs mt-1 font-medium" style={{ color: "#EF4444" }}>{errors.name}</p>}
          </div>

          {/* Phone */}
          <div className="mb-6">
            <label className="block text-sm font-semibold mb-1.5" style={{ color: "#374151" }}>WhatsApp</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">📱</span>
              <input type="tel" placeholder="(11) 99999-9999" value={clientPhone}
                onChange={e => { setClientPhone(formatPhone(e.target.value)); if (errors.phone) setErrors({...errors, phone: ""}); }}
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-medium transition-all outline-none"
                style={{ background: errors.phone ? "#FFF1F2" : `${accent}10`, border: `2px solid ${errors.phone ? "#F87171" : clientPhone ? accent : `${accent}30`}`, color: "#1F1535" }}
              />
            </div>
            {errors.phone && <p className="text-xs mt-1 font-medium" style={{ color: "#EF4444" }}>{errors.phone}</p>}
          </div>

          {/* Info card */}
          <div className="rounded-2xl p-4 mb-6 flex gap-3" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
            <span className="text-xl">🔒</span>
            <p className="text-xs leading-relaxed" style={{ color: accent }}>
              Seus dados são usados apenas para confirmar o agendamento via WhatsApp.
            </p>
          </div>

          <button onClick={handleNext} className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95" style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, boxShadow: `0 8px 24px ${accent}55` }}>
            Continuar →
          </button>
        </div>

        <div className="mt-auto pt-6 grid grid-cols-3 gap-3">
          {[{ icon: "⚡", label: "Rápido" }, { icon: "✅", label: "Fácil" }, { icon: "🎯", label: "Seguro" }].map(f => (
            <div key={f.label} className="flex flex-col items-center gap-1 py-3 rounded-2xl" style={{ background: "white", border: `1px solid ${accent}20` }}>
              <span className="text-xl">{f.icon}</span>
              <span className="text-xs font-semibold" style={{ color: accent }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Employees (Salon) ── */
function Step2Employees({ employees, selected, clientName, accent, onSelect, onBack }: {
  employees: Employee[]; selected: Employee | null; clientName: string; accent: string; onSelect: (e: Employee) => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-[calc(860px-60px)]">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: `${accent}10`, color: accent }}>←</button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1F1535" }}>Escolha o Profissional</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Olá, {clientName}! Quem vai te atender?</p>
        </div>
      </div>
      <div className="flex-1 px-5 pb-4 space-y-3 overflow-y-auto">
        {employees.map(emp => {
          const isSelected = selected?.id === emp.id;
          return (
            <button key={emp.id} onClick={() => onSelect(emp)} className="w-full text-left transition-all active:scale-[0.98]">
              <div className="rounded-2xl p-4 transition-all duration-200" style={{ background: isSelected ? `${accent}10` : "white", border: `2px solid ${isSelected ? accent : `${accent}10`}`, boxShadow: isSelected ? `0 4px 20px ${accent}25` : "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    {emp.avatar_url ? (
                      <img src={emp.avatar_url} alt={emp.name} className="w-16 h-16 rounded-2xl object-cover" style={{ border: `2px solid ${isSelected ? accent : `${accent}20`}` }} />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold" style={{ background: `${accent}15`, color: accent, border: `2px solid ${isSelected ? accent : `${accent}20`}` }}>
                        {emp.name[0]}
                      </div>
                    )}
                    {isSelected && <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: accent }}>✓</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm" style={{ color: "#1F1535" }}>{emp.name}</h3>
                    {emp.specialty && <p className="text-xs font-medium mt-0.5" style={{ color: accent }}>{emp.specialty}</p>}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        {employees.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: `2px dashed ${accent}30` }}>
            <p style={{ color: "#9CA3AF" }}>Nenhum profissional disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 3: Services ── */
function Step3Services({ services, groupedServices, selected, selectedEmployee, accent, isSalon, onSelect, onBack }: {
  services: Service[]; groupedServices: Record<string, Service[]>; selected: Service | null; selectedEmployee: Employee | null; accent: string; isSalon: boolean; onSelect: (s: Service) => void; onBack: () => void;
}) {
  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-[calc(860px-60px)]">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: `${accent}10`, color: accent }}>←</button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1F1535" }}>Escolha o Serviço</h2>
          {isSalon && selectedEmployee && <p className="text-xs" style={{ color: "#9CA3AF" }}>Profissional: {selectedEmployee.name}</p>}
        </div>
      </div>

      {isSalon && selectedEmployee && (
        <div className="px-5 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
            {selectedEmployee.avatar_url ? (
              <img src={selectedEmployee.avatar_url} alt={selectedEmployee.name} className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ background: `${accent}20`, color: accent }}>{selectedEmployee.name[0]}</div>
            )}
            <div>
              <p className="text-sm font-bold" style={{ color: "#1F1535" }}>{selectedEmployee.name}</p>
              {selectedEmployee.specialty && <p className="text-xs" style={{ color: accent }}>{selectedEmployee.specialty}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 px-5 pb-4 space-y-3 overflow-y-auto">
        <p className="text-xs font-semibold mb-2" style={{ color: "#9CA3AF" }}>{services.length} SERVIÇOS DISPONÍVEIS</p>
        {Object.entries(groupedServices).map(([category, svcs]) => (
          <div key={category}>
            {Object.keys(groupedServices).length > 1 && <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>{category}</p>}
            {svcs.map(svc => {
              const isSelected = selected?.id === svc.id;
              return (
                <button key={svc.id} onClick={() => onSelect(svc)} className="w-full text-left transition-all active:scale-[0.98] mb-3">
                  <div className="rounded-2xl p-4 transition-all duration-200" style={{ background: isSelected ? `${accent}10` : "white", border: `2px solid ${isSelected ? accent : `${accent}10`}`, boxShadow: isSelected ? `0 4px 20px ${accent}25` : "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-sm" style={{ color: "#1F1535" }}>{svc.name}</h3>
                          {isSelected && <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0" style={{ background: accent }}>✓</div>}
                        </div>
                        {svc.description && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "#6B7280" }}>{svc.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-base font-bold" style={{ color: accent }}>{formatCurrency(Number(svc.price))}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accent}10`, color: accent }}>⏱ {svc.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
        {services.length === 0 && (
          <div className="rounded-2xl p-8 text-center" style={{ background: "white", border: `2px dashed ${accent}30` }}>
            <p style={{ color: "#9CA3AF" }}>Nenhum serviço disponível no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Step 4: Date & Time ── */
function Step4DateTime({ service, accent, days, today, selectedDate, setSelectedDate, selectedTime, setSelectedTime, slots, loadingSlots, selectedSlot, setSelectedSlot, onNext, onBack }: {
  service: Service; accent: string; days: Date[]; today: Date; selectedDate: Date | null; setSelectedDate: (d: Date | null) => void; selectedTime: string; setSelectedTime: (t: string) => void; slots: Slot[]; loadingSlots: boolean; selectedSlot: Slot | null; setSelectedSlot: (s: Slot | null) => void; onNext: () => void; onBack: () => void;
}) {
  const handleDaySelect = (d: Date) => { setSelectedDate(d); setSelectedTime(""); setSelectedSlot(null); };
  const handleTimeSelect = (slot: Slot) => { setSelectedSlot(slot); setSelectedTime(format(new Date(slot.start_time), "HH:mm")); };
  const canContinue = selectedDate && selectedSlot;

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-[calc(860px-60px)]">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: `${accent}10`, color: accent }}>←</button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1F1535" }}>Data e Horário</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{service.name} · {service.duration_minutes} min</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold" style={{ color: "#1F1535" }}>Escolha o dia</p>
          <p className="text-xs font-medium" style={{ color: accent }}>
            {selectedDate ? `${MONTHS_PT[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : `${MONTHS_PT[today.getMonth()]} ${today.getFullYear()}`}
          </p>
        </div>

        {/* Day picker horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
          {days.map(d => {
            const isSelected = selectedDate?.toDateString() === d.toDateString();
            const isToday = d.toDateString() === today.toDateString();
            return (
              <button key={d.toISOString()} onClick={() => handleDaySelect(d)}
                className="flex-shrink-0 flex flex-col items-center gap-1 py-3 px-3 rounded-2xl transition-all active:scale-90 min-w-[56px]"
                style={{ background: isSelected ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : isToday ? `${accent}10` : "white", border: `2px solid ${isSelected ? accent : isToday ? `${accent}60` : `${accent}10`}`, boxShadow: isSelected ? `0 4px 12px ${accent}50` : "0 1px 4px rgba(0,0,0,0.04)" }}>
                <span className="text-xs font-medium" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : "#9CA3AF" }}>{DAYS_PT[d.getDay()]}</span>
                <span className="text-lg font-bold leading-none" style={{ color: isSelected ? "white" : "#1F1535" }}>{d.getDate()}</span>
                {isToday && !isSelected && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />}
              </button>
            );
          })}
        </div>

        {/* Time slots */}
        {selectedDate ? (
          loadingSlots ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} /></div>
          ) : slots.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold" style={{ color: "#1F1535" }}>Horários disponíveis</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{DAYS_PT[selectedDate.getDay()]}, {selectedDate.getDate()} de {MONTHS_PT[selectedDate.getMonth()]}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {slots.map(slot => {
                  const time = format(new Date(slot.start_time), "HH:mm");
                  const isSelected = selectedSlot?.start_time === slot.start_time;
                  return (
                    <button key={slot.start_time} onClick={() => handleTimeSelect(slot)}
                      className="py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                      style={{ background: isSelected ? `linear-gradient(135deg, ${accent}, ${accent}cc)` : "white", color: isSelected ? "white" : "#374151", border: `2px solid ${isSelected ? accent : `${accent}20`}`, boxShadow: isSelected ? `0 4px 12px ${accent}50` : "none" }}>
                      {time}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl" style={{ background: "#F9FAFB", border: `2px dashed ${accent}20` }}>
              <span className="text-4xl mb-2">😔</span>
              <p className="text-sm font-medium" style={{ color: "#9CA3AF" }}>Nenhum horário disponível nesta data</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl" style={{ background: "#F9FAFB", border: `2px dashed ${accent}20` }}>
            <span className="text-4xl mb-2">📅</span>
            <p className="text-sm font-medium" style={{ color: "#9CA3AF" }}>Selecione um dia para ver os horários</p>
          </div>
        )}
      </div>

      <div className="px-5 pb-6 pt-2">
        {canContinue && (
          <div className="rounded-2xl p-3 mb-3 flex items-center gap-2" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
            <span className="text-lg">📅</span>
            <div>
              <p className="text-xs font-bold" style={{ color: accent }}>{DAYS_PT[selectedDate!.getDay()]}, {selectedDate!.getDate()} de {MONTHS_PT[selectedDate!.getMonth()]} às {selectedTime}</p>
              <p className="text-xs" style={{ color: "#9CA3AF" }}>{service.name} · {service.duration_minutes} min</p>
            </div>
          </div>
        )}
        <button onClick={() => canContinue && onNext()} disabled={!canContinue}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: canContinue ? `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)` : `${accent}60`, boxShadow: canContinue ? `0 8px 24px ${accent}55` : "none" }}>
          {canContinue ? "Confirmar Data e Horário →" : "Selecione data e horário"}
        </button>
      </div>
    </div>
  );
}

/* ── Step 5: Confirmation ── */
function Step5Confirm({ professional, selectedEmployee, selectedService, selectedSlot, clientName, clientPhone, accent, isSalon, paymentConfig, signalAmount, totalPrice, remainingValue, submitting, onConfirm, onBack }: {
  professional: Professional; selectedEmployee: Employee | null; selectedService: Service; selectedSlot: Slot | null; clientName: string; clientPhone: string; accent: string; isSalon: boolean; paymentConfig: PaymentConfig | null; signalAmount: number | null; totalPrice: number; remainingValue: number; submitting: boolean; onConfirm: () => void; onBack: () => void;
}) {
  if (!selectedSlot) return null;
  const startDate = new Date(selectedSlot.start_time);

  return (
    <div className="flex flex-col min-h-[calc(100vh-60px)] md:min-h-[calc(860px-60px)]">
      <div className="px-5 pt-4 pb-3 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: `${accent}10`, color: accent }}>←</button>
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#1F1535" }}>Confirmar Agendamento</h2>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>Revise os detalhes antes de confirmar</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {/* Professional + service summary card */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1.5px solid ${accent}20` }}>
          <div className="flex items-center gap-3 p-4" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
            {(isSalon && selectedEmployee?.avatar_url) ? (
              <img src={selectedEmployee.avatar_url} alt={selectedEmployee.name} className="w-14 h-14 rounded-xl object-cover" style={{ border: "2px solid rgba(255,255,255,0.3)" }} />
            ) : professional.logo_url ? (
              <img src={professional.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" style={{ border: "2px solid rgba(255,255,255,0.3)" }} />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold" style={{ background: "rgba(255,255,255,0.2)" }}>
                {(isSalon && selectedEmployee ? selectedEmployee.name : professional.business_name || professional.name)?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="text-white">
              <p className="font-bold text-base">{isSalon && selectedEmployee ? selectedEmployee.name : professional.business_name || professional.name}</p>
              {isSalon && selectedEmployee?.specialty && <p className="text-xs opacity-80">{selectedEmployee.specialty}</p>}
            </div>
          </div>

          <div className="bg-white p-4 space-y-3">
            {[
              { icon: "📋", label: "Serviço", value: selectedService.name },
              { icon: "⏱", label: "Duração", value: `${selectedService.duration_minutes} min` },
              { icon: "📅", label: "Data", value: `${DAYS_FULL[startDate.getDay()]}, ${startDate.getDate()} de ${MONTHS_PT[startDate.getMonth()]}` },
              { icon: "⏰", label: "Horário", value: format(startDate, "HH:mm") },
              { icon: "👤", label: "Cliente", value: clientName },
              { icon: "📱", label: "WhatsApp", value: clientPhone },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-base w-6 text-center">{item.icon}</span>
                <span className="text-xs flex-1" style={{ color: "#6B7280" }}>{item.label}</span>
                <span className="text-xs font-semibold" style={{ color: "#1F1535" }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment summary */}
        {signalAmount && (
          <div className="rounded-2xl p-4 mb-4" style={{ background: `${accent}10`, border: `1.5px solid ${accent}30` }}>
            <p className="text-sm font-bold mb-3" style={{ color: "#1F1535" }}>💰 Resumo de Pagamento</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: "#6B7280" }}>Valor total do serviço</span>
                <span className="text-sm font-bold" style={{ color: "#1F1535" }}>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div><span className="text-xs font-semibold" style={{ color: accent }}>Sinal — via PIX</span><p className="text-xs" style={{ color: "#9CA3AF" }}>Pago agora para reservar a vaga</p></div>
                <span className="text-sm font-bold" style={{ color: accent }}>{formatCurrency(signalAmount)}</span>
              </div>
              <div className="h-px my-1" style={{ background: `${accent}30` }} />
              <div className="flex justify-between items-center">
                <div><span className="text-xs font-semibold" style={{ color: "#374151" }}>Restante no local</span><p className="text-xs" style={{ color: "#9CA3AF" }}>Pago pessoalmente no dia</p></div>
                <span className="text-sm font-bold" style={{ color: "#374151" }}>{formatCurrency(remainingValue)}</span>
              </div>
            </div>
          </div>
        )}

        {signalAmount && (
          <div className="rounded-2xl p-3 flex gap-2 mb-2" style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <span className="text-base">⚠️</span>
            <p className="text-xs leading-relaxed" style={{ color: "#92400E" }}>
              O sinal de {formatCurrency(signalAmount)} é necessário para garantir sua vaga.
            </p>
          </div>
        )}
      </div>

      <div className="px-5 pb-6 pt-2">
        <button onClick={onConfirm} disabled={submitting}
          className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, boxShadow: `0 8px 24px ${accent}55` }}>
          {submitting ? <Loader2 size={18} className="animate-spin" /> : (signalAmount ? "Confirmar e Pagar Sinal →" : "Confirmar Agendamento →")}
        </button>
      </div>
    </div>
  );
}

/* ── Success View ── */
function SuccessView({ professional, selectedEmployee, selectedService, selectedSlot, clientName, clientPhone, accent, signalAmount, paymentConfig, reviewRating, setReviewRating, reviewComment, setReviewComment, reviewSubmitted, submittingReview, onSubmitReview, onReset }: {
  professional: Professional; selectedEmployee: Employee | null; selectedService: Service | null; selectedSlot: Slot | null; clientName: string; clientPhone: string; accent: string; signalAmount: number | null; paymentConfig: PaymentConfig | null; reviewRating: number; setReviewRating: (n: number) => void; reviewComment: string; setReviewComment: (s: string) => void; reviewSubmitted: boolean; submittingReview: boolean; onSubmitReview: () => void; onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20px)] md:min-h-[calc(860px-20px)] px-5 text-center py-8">
      <div className="animate-scale-in">
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl mx-auto mb-6" style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 16px 40px ${accent}60` }}>
          ✅
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#1F1535" }}>
          {(() => {
            const msg = professional.confirmation_message || "Agendamento Confirmado!";
            if (!selectedService || !selectedSlot) return msg;
            const slotDate = new Date(selectedSlot.start_time);
            return msg
              .replace("{nome}", clientName)
              .replace("{servico}", selectedService.name)
              .replace("{data}", `${slotDate.getDate()} de ${MONTHS_PT[slotDate.getMonth()]}`)
              .replace("{horario}", format(slotDate, "HH:mm"));
          })()}
        </h2>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: "#6B7280" }}>
          Você receberá uma confirmação no WhatsApp <strong style={{ color: accent }}>{clientPhone}</strong>.
        </p>

        {/* Summary card */}
        {selectedService && selectedSlot && (
          <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
            <div className="space-y-3">
              {[
                { label: "Cliente", value: clientName, icon: "👤" },
                ...(selectedEmployee ? [{ label: "Profissional", value: selectedEmployee.name, icon: "✂️" }] : []),
                { label: "Serviço", value: selectedService.name, icon: "📋" },
                { label: "Data", value: `${DAYS_FULL[new Date(selectedSlot.start_time).getDay()]}, ${new Date(selectedSlot.start_time).getDate()} de ${MONTHS_PT[new Date(selectedSlot.start_time).getMonth()]}`, icon: "📅" },
                { label: "Horário", value: format(new Date(selectedSlot.start_time), "HH:mm"), icon: "⏰" },
                ...(signalAmount ? [{ label: "Sinal pago", value: formatCurrency(signalAmount), icon: "💳" }] : []),
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-xs" style={{ color: "#6B7280" }}>{item.label}:</span>
                  <span className="text-xs font-bold ml-auto" style={{ color: "#1F1535" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Review Form */}
        {!reviewSubmitted ? (
          <div className="rounded-2xl p-5 mb-6 text-left" style={{ background: "white", border: `1px solid ${accent}20` }}>
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3" style={{ color: "#1F1535" }}>
              <Star size={16} className="text-yellow-500" /> Como foi sua experiência?
            </h3>
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setReviewRating(s)} className="transition-transform hover:scale-110">
                  <Star size={28} className={cn("transition-colors", s <= reviewRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300")} />
                </button>
              ))}
            </div>
            <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Conte como foi (opcional)" maxLength={500} rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm resize-none outline-none mb-3" style={{ background: `${accent}08`, border: `1.5px solid ${accent}20`, color: "#1F1535" }} />
            <button onClick={onSubmitReview} disabled={submittingReview}
              className="w-full py-2.5 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: accent }}>
              {submittingReview ? <Loader2 size={14} className="animate-spin" /> : "Enviar avaliação"}
            </button>
          </div>
        ) : (
          <p className="text-sm font-medium flex items-center justify-center gap-2 mb-6" style={{ color: "#10B981" }}>✅ Obrigado pela avaliação!</p>
        )}

        <button onClick={onReset} className="w-full py-4 rounded-2xl text-white font-bold text-base transition-all active:scale-95"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`, boxShadow: `0 8px 24px ${accent}55` }}>
          Fazer Novo Agendamento
        </button>
      </div>
    </div>
  );
}

export default PublicBooking;
