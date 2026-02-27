import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useBookings, useUpdateBooking } from "@/hooks/useBookings";
import { useSalonEmployees } from "@/hooks/useSalonEmployees";
import { format } from "date-fns";
import { Clock, User, Scissors, DollarSign, CreditCard, Banknote, Smartphone, CheckCircle2 } from "lucide-react";
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
  const updateBooking = useUpdateBooking();

  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedBooking) return;

    // Block completing without payment confirmation
    if (newStatus === "completed" && !isPaymentConfirmed) {
      toast.error("Confirme o pagamento antes de concluir o atendimento.");
      return;
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

  // Check if booking was from public page (has stripe_payment_intent_id or was created without auth)
  const getBookingPaymentInfo = (booking: any) => {
    const totalPrice = booking.price || 0;
    // If has stripe payment intent, it was from public page with signal payment
    const hasPublicPayment = !!booking.stripe_payment_intent_id;
    // Approximate: signal was already paid, rest is pending
    // For simplicity, if public booking we assume a signal was paid
    return {
      totalPrice,
      isPublicBooking: hasPublicPayment,
      // We don't have exact signal amount stored on booking, show full price as remaining
      remainingAmount: totalPrice,
    };
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
                  items.map((booking) => {
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
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

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

          {selectedBooking && (
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
                    {formatCurrency(selectedBooking.price || 0)}
                  </span>
                </div>
                {selectedBooking.stripe_payment_intent_id && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sinal pago (online)</span>
                    <span className="text-success font-medium text-xs">✓ Via página pública</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status atual</span>
                  <span className="text-foreground font-medium">
                    {statusLabels[selectedBooking.status] || selectedBooking.status}
                  </span>
                </div>
              </div>

              {/* Payment section - only show if not completed/cancelled */}
              {selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Receber pagamento</h4>
                  <p className="text-xs text-muted-foreground">
                    Valor a receber: <span className="text-primary font-bold">{formatCurrency(getBookingPaymentInfo(selectedBooking).remainingAmount)}</span>
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
                      >
                        <pm.icon size={14} />
                        {pm.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod && (
                    <Button
                      variant={isPaymentConfirmed ? "default" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setIsPaymentConfirmed(true);
                        toast.success("Pagamento confirmado!");
                      }}
                      disabled={isPaymentConfirmed}
                    >
                      <CheckCircle2 size={14} className="mr-1.5" />
                      {isPaymentConfirmed ? "Pagamento confirmado ✓" : "Confirmar pagamento"}
                    </Button>
                  )}
                </div>
              )}

              {/* Status change actions */}
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
                        disabled={updateBooking.isPending || !isPaymentConfirmed}
                      >
                        {isPaymentConfirmed ? "Concluir ✓" : "Concluir (pague primeiro)"}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default CustomerJourney;
