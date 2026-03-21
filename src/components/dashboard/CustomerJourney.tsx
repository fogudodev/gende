import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useBookings, useUpdateBooking } from "@/hooks/useBookings";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { usePaymentConfig } from "@/hooks/usePaymentConfig";
import { useProfessional } from "@/hooks/useProfessional";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { format } from "date-fns";
import { Clock, User, Scissors, DollarSign, CreditCard, Banknote, Smartphone, CheckCircle2, FileText } from "lucide-react";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const stages = [
  { key: "pending", title: "Pendentes", color: "bg-warning" },
  { key: "confirmed", title: "Confirmados", color: "bg-info" },
  { key: "completed", title: "Concluídos", color: "bg-success" },
  { key: "cancelled", title: "Cancelados", color: "bg-destructive" },
];

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "No-show",
};

const getInitials = (name: string) => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const paymentMethods = [
  { key: "credit_card", label: "Cartão de Crédito", icon: CreditCard },
  { key: "debit_card", label: "Cartão de Débito", icon: CreditCard },
  { key: "cash", label: "Dinheiro", icon: Banknote },
  { key: "pix", label: "PIX", icon: Smartphone },
];

const CustomerJourney = () => {
  const today = useMemo(() => new Date(), []);
  const { data: bookings } = useBookings(today);
  const { data: employees } = useSalonEmployees();
  const { data: paymentConfig } = usePaymentConfig();
  const { data: professional } = useProfessional();
  const updateBooking = useUpdateBooking();
  const queryClient = useQueryClient();

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewAllStatus, setViewAllStatus] = useState<string | null>(null);

  // Fetch existing payments for today's bookings
  const bookingIds = useMemo(() => (bookings || []).map((b: any) => b.id), [bookings]);
  const { data: existingPayments } = useQuery({
    queryKey: ["booking-payments", bookingIds],
    queryFn: async () => {
      if (bookingIds.length === 0) return [];
      const { data } = await supabase
        .from("payments")
        .select("*")
        .in("booking_id", bookingIds);
      return data || [];
    },
    enabled: bookingIds.length > 0,
  });

  // Map payments by booking_id
  const paymentsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    (existingPayments || []).forEach((p: any) => {
      const list = map.get(p.booking_id) || [];
      list.push(p);
      map.set(p.booking_id, list);
    });
    return map;
  }, [existingPayments]);

  // Map employees by id
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    (employees || []).forEach((e: any) => map.set(e.id, e.name));
    return map;
  }, [employees]);

  // Group today's bookings by status
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = { pending: [], confirmed: [], completed: [], cancelled: [] };
    (bookings || []).forEach((b: any) => {
      const status = b.status as string;
      if (status === "no_show") {
        map.cancelled.push(b);
      } else if (map[status]) {
        map[status].push(b);
      }
    });
    return map;
  }, [bookings]);

  const openModal = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentMethod(null);
    setIsPaymentConfirmed(false);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setPaymentMethod(null);
    setIsPaymentConfirmed(false);
  };

  // Calculate signal amount for a booking
  const getSignalAmount = (bookingPrice: number) => {
    if (!paymentConfig?.signal_enabled) return 0;
    if (paymentConfig.signal_type === "percentage") {
      return Math.round((bookingPrice * paymentConfig.signal_value / 100) * 100) / 100;
    }
    return Math.min(paymentConfig.signal_value, bookingPrice);
  };

  // Get payment info for a booking
  const getBookingPaymentInfo = (booking: any) => {
    const totalPrice = booking.price || 0;
    const isPublicBooking = !!booking.stripe_payment_intent_id;
    const payments = paymentsMap.get(booking.id) || [];
    const totalPaid = payments
      .filter((p: any) => p.status === "completed" || p.status === "succeeded")
      .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    let signalAmount = 0;
    if (isPublicBooking && paymentConfig?.signal_enabled) {
      signalAmount = getSignalAmount(totalPrice);
    }

    const remainingAmount = Math.max(0, totalPrice - totalPaid);

    return { totalPrice, isPublicBooking, signalAmount, totalPaid, remainingAmount };
  };

  const paymentMethodLabels: Record<string, string> = {
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    cash: "Dinheiro",
    pix: "PIX",
  };

  const generateReceiptPDF = async (booking: any, amount: number, method: string) => {
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    const profName = professional?.business_name || professional?.name || "Estabelecimento";
    const clientName = booking.client_name || booking.clients?.name || "Cliente";
    const serviceName = booking.services?.name || "Serviço";
    const dateStr = format(new Date(booking.start_time), "dd/MM/yyyy");
    const timeStr = format(new Date(booking.start_time), "HH:mm");
    const employeeName = booking.employee_id ? employeeMap.get(booking.employee_id) || "—" : profName;

    let y = 15;

    // Try to add logo
    const logoUrl = professional?.logo_url || professional?.avatar_url;
    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = logoUrl;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        const logoSize = 18;
        doc.addImage(dataUrl, "PNG", 74 - logoSize / 2, y, logoSize, logoSize);
        y += logoSize + 4;
      } catch {
        // Skip logo on error
      }
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(profName, 74, y, { align: "center" });
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("RECIBO DE PAGAMENTO", 74, y, { align: "center" });
    y += 10;
    doc.setDrawColor(200);
    doc.line(10, y, 138, y);
    y += 8;

    const addLine = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(label, 12, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, 60, y);
      y += 6;
    };

    addLine("Cliente:", clientName);
    addLine("Serviço:", serviceName);
    addLine("Profissional:", employeeName);
    addLine("Data:", dateStr);
    addLine("Horário:", timeStr);
    addLine("Forma de pagamento:", paymentMethodLabels[method] || method);
    
    y += 2;
    doc.line(10, y, 138, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Valor pago:", 12, y);
    doc.text(formatCurrency(amount), 138, y, { align: "right" });
    y += 10;
    doc.line(10, y, 138, y);
    y += 12;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 74, y, { align: "center" });
    y += 5;
    doc.text("Este recibo comprova o pagamento do serviço acima.", 74, y, { align: "center" });

    doc.save(`recibo-${clientName.replace(/\s+/g, "-").toLowerCase()}-${dateStr.replace(/\//g, "-")}.pdf`);
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooking || !paymentMethod || !professional) return;
    setIsProcessing(true);

    try {
      const info = getBookingPaymentInfo(selectedBooking);
      
      await supabase.from("payments").insert({
        professional_id: professional.id,
        booking_id: selectedBooking.id,
        amount: info.remainingAmount,
        status: "completed",
        payment_method: paymentMethod,
      });

      // Generate PDF receipt
      generateReceiptPDF(selectedBooking, info.remainingAmount, paymentMethod);

      setIsPaymentConfirmed(true);
      queryClient.invalidateQueries({ queryKey: ["booking-payments"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast.success("Pagamento registrado! Recibo gerado.");
    } catch {
      toast.error("Erro ao registrar pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedBooking) return;

    if (newStatus === "completed") {
      const info = getBookingPaymentInfo(selectedBooking);
      // Allow completion if: payment was just confirmed in this session, or remaining is already 0, or price is 0
      if (!isPaymentConfirmed && info.remainingAmount > 0 && info.totalPrice > 0) {
        toast.error("Confirme o pagamento antes de concluir o atendimento.");
        return;
      }
    }

    try {
      await updateBooking.mutateAsync({
        id: selectedBooking.id,
        status: newStatus as any,
      });
      toast.success(`Status alterado para ${statusLabels[newStatus] || newStatus}`);
      closeModal();
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="glass-card rounded-2xl p-4 md:p-6 lg:p-8"
    >
      <div className="mb-4 md:mb-6">
        <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground font-display mb-1">
          Jornada do Cliente
        </h2>
        <p className="text-muted-foreground text-xs md:text-sm">
          Agendamentos de hoje — {format(today, "dd/MM/yyyy")}
        </p>
      </div>

      {/* Kanban stages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stages.map((stage) => {
          const items = grouped[stage.key] || [];
          return (
            <div key={stage.key} className="flex flex-col">
              <div className="mb-2.5 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                <h3 className="font-semibold text-foreground text-xs md:text-sm">
                  {stage.title}
                  <span className="ml-1.5 text-muted-foreground font-normal">({items.length})</span>
                </h3>
              </div>

              <div className="space-y-2 flex-1">
                {items.length === 0 ? (
                  <div className="bg-secondary/20 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Nenhum</p>
                  </div>
                ) : (
                  <>
                    {items.slice(0, 2).map((booking) => {
                      const name = booking.client_name || booking.clients?.name || "—";
                      const serviceName = booking.services?.name || "—";
                      const employeeName = booking.employee_id ? employeeMap.get(booking.employee_id) || "—" : "Próprio";
                      const time = format(new Date(booking.start_time), "HH:mm");
                      const price = booking.price || 0;

                      return (
                        <div
                          key={booking.id}
                          onClick={() => openModal(booking)}
                          className="bg-secondary/40 rounded-xl p-3 hover:bg-secondary/70 transition-all duration-200 border border-border/50 hover:border-primary/20 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 mb-2">
                            <div
                              className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${stage.color}/20 flex items-center justify-center text-[10px] md:text-xs font-bold flex-shrink-0`}
                            >
                              {getInitials(name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs md:text-sm font-medium text-foreground truncate">
                                {name}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1 pl-9 md:pl-10">
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Clock size={10} />
                              <span>{time}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <Scissors size={10} />
                              <span className="truncate">{serviceName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <User size={10} />
                              <span className="truncate">{employeeName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-primary font-semibold">
                              <DollarSign size={10} />
                              <span>{formatCurrency(price)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {items.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[10px] md:text-xs text-primary hover:text-primary/80 h-7"
                        onClick={() => setViewAllStatus(stage.key)}
                      >
                        Ver todos ({items.length})
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* View all modal */}
      <Dialog open={!!viewAllStatus} onOpenChange={(open) => !open && setViewAllStatus(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {stages.find(s => s.key === viewAllStatus)?.title || ""} — {format(today, "dd/MM/yyyy")}
            </DialogTitle>
            <DialogDescription>
              {(grouped[viewAllStatus || ""] || []).length} agendamento(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {(grouped[viewAllStatus || ""] || []).map((booking) => {
              const name = booking.client_name || booking.clients?.name || "—";
              const serviceName = booking.services?.name || "—";
              const employeeName = booking.employee_id ? employeeMap.get(booking.employee_id) || "—" : "Próprio";
              const time = format(new Date(booking.start_time), "HH:mm");
              const price = booking.price || 0;
              const stageInfo = stages.find(s => s.key === viewAllStatus);

              return (
                <div
                  key={booking.id}
                  onClick={() => { setViewAllStatus(null); openModal(booking); }}
                  className="bg-secondary/40 rounded-xl p-3 hover:bg-secondary/70 transition-all duration-200 border border-border/50 hover:border-primary/20 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className={`w-8 h-8 rounded-full ${stageInfo?.color || "bg-muted"}/20 flex items-center justify-center text-xs font-bold flex-shrink-0`}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                    </div>
                  </div>
                  <div className="space-y-1 pl-10">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>{time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Scissors size={12} />
                      <span className="truncate">{serviceName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User size={12} />
                      <span className="truncate">{employeeName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold">
                      <DollarSign size={12} />
                      <span>{formatCurrency(price)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking detail modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {selectedBooking?.client_name || selectedBooking?.clients?.name || "Cliente"}
            </DialogTitle>
            <DialogDescription>
              Gerencie o atendimento e pagamento
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (() => {
            const info = getBookingPaymentInfo(selectedBooking);
            return (
              <div className="space-y-5">
                {/* Booking info */}
                <div className="space-y-2 bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Horário</span>
                    <span className="text-foreground font-medium">
                      {format(new Date(selectedBooking.start_time), "HH:mm")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Serviço</span>
                    <span className="text-foreground font-medium">
                      {selectedBooking.services?.name || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profissional</span>
                    <span className="text-foreground font-medium">
                      {selectedBooking.employee_id
                        ? employeeMap.get(selectedBooking.employee_id) || "—"
                        : "Próprio"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Valor total</span>
                    <span className="text-primary font-bold">
                      {formatCurrency(info.totalPrice)}
                    </span>
                  </div>

                  {/* Signal info for public bookings */}
                  {info.isPublicBooking && info.signalAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sinal pago (online)</span>
                      <span className="text-success font-semibold">
                        - {formatCurrency(info.signalAmount)}
                      </span>
                    </div>
                  )}

                  {info.totalPaid > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total já pago</span>
                      <span className="text-success font-semibold">
                        {formatCurrency(info.totalPaid)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm border-t border-border/50 pt-2 mt-1">
                    <span className="text-muted-foreground font-semibold">Valor restante</span>
                    <span className={`font-bold ${info.remainingAmount > 0 ? "text-warning" : "text-success"}`}>
                      {formatCurrency(info.remainingAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status atual</span>
                    <span className="text-foreground font-medium">
                      {statusLabels[selectedBooking.status] || selectedBooking.status}
                    </span>
                  </div>
                </div>

                {/* Payment section - only show if not completed/cancelled and has remaining */}
                {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && info.remainingAmount > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Receber pagamento</h4>
                    <p className="text-xs text-muted-foreground">
                      Valor a receber: <span className="text-primary font-bold">{formatCurrency(info.remainingAmount)}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map((pm) => (
                        <button
                          key={pm.key}
                          onClick={() => setPaymentMethod(pm.key)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all ${
                            paymentMethod === pm.key
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
                          }`}
                          disabled={isPaymentConfirmed}
                        >
                          <pm.icon size={14} />
                          {pm.label}
                        </button>
                      ))}
                    </div>

                    {paymentMethod && !isPaymentConfirmed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={handleConfirmPayment}
                        disabled={isProcessing}
                      >
                        <CheckCircle2 size={14} className="mr-1.5" />
                        {isProcessing ? "Registrando..." : `Confirmar pagamento de ${formatCurrency(info.remainingAmount)}`}
                      </Button>
                    )}

                    {isPaymentConfirmed && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-medium">
                        <CheckCircle2 size={14} />
                        Pagamento registrado com sucesso
                      </div>
                    )}
                  </div>
                )}

                {/* Already fully paid indicator */}
                {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && info.remainingAmount <= 0 && info.totalPaid > 0 && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs font-medium">
                    <CheckCircle2 size={14} />
                    Pagamento completo — pronto para concluir
                  </div>
                )}

                {/* Status change actions */}
                {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Alterar status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedBooking.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleStatusChange("confirmed")}
                            disabled={updateBooking.isPending}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive border-destructive/30"
                            onClick={() => handleStatusChange("cancelled")}
                            disabled={updateBooking.isPending}
                          >
                            Cancelar
                          </Button>
                        </>
                      )}
                      {selectedBooking.status === "confirmed" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => handleStatusChange("completed")}
                            disabled={updateBooking.isPending || (!isPaymentConfirmed && info.remainingAmount > 0)}
                          >
                            {isPaymentConfirmed || info.remainingAmount <= 0 ? "Concluir ✓" : "Concluir (pague primeiro)"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-destructive border-destructive/30"
                            onClick={() => handleStatusChange("cancelled")}
                            disabled={updateBooking.isPending}
                          >
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs text-muted-foreground col-span-2"
                            onClick={() => handleStatusChange("no_show")}
                            disabled={updateBooking.isPending}
                          >
                            No-show
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CustomerJourney;
