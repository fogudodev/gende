import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, Loader2, X, Clock, User, Scissors, Trash2, Phone } from "lucide-react";
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking } from "@/hooks/useBookings";
import { useServices } from "@/hooks/useServices";
import { useClients } from "@/hooks/useClients";
import { format, addDays, subDays, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const timeSlots = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
  "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30",
  "19:00", "19:30", "20:00", "20:30", "21:00",
];

const statusColors: Record<string, string> = {
  confirmed: "border-l-green-500 bg-green-500/10",
  pending: "border-l-yellow-500 bg-yellow-500/10",
  completed: "border-l-blue-500 bg-blue-500/10",
  cancelled: "border-l-red-500 bg-red-500/10",
  no_show: "border-l-gray-500 bg-gray-500/10",
};

const statusLabels: Record<string, string> = {
  confirmed: "Confirmado",
  pending: "Pendente",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<any>(null);

  const { data: bookings, isLoading } = useBookings(selectedDate);
  const { data: services } = useServices();
  const { data: clients } = useClients();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  // Create form state
  const [formService, setFormService] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formClientPhone, setFormClientPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("confirmed");

  const resetForm = () => {
    setFormService("");
    setFormTime("");
    setFormClientName("");
    setFormClientPhone("");
    setFormNotes("");
    setFormStatus("confirmed");
  };

  const openCreate = (slot?: string) => {
    resetForm();
    if (slot) setFormTime(slot);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!formService || !formTime || !formClientName) {
      toast.error("Preencha serviço, horário e nome do cliente");
      return;
    }

    const service = services?.find(s => s.id === formService);
    if (!service) return;

    const [h, m] = formTime.split(":").map(Number);
    const startTime = setMinutes(setHours(selectedDate, h), m);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    try {
      await createBooking.mutateAsync({
        service_id: formService,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        client_name: formClientName,
        client_phone: formClientPhone,
        notes: formNotes,
        status: formStatus as any,
        price: service.price,
        duration_minutes: service.duration_minutes,
      });
      toast.success("Agendamento criado!");
      setShowCreate(false);
    } catch {
      toast.error("Erro ao criar agendamento");
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateBooking.mutateAsync({ id, status: status as any });
      toast.success(`Status: ${statusLabels[status]}`);
      if (detailBooking?.id === id) setDetailBooking((prev: any) => ({ ...prev, status }));
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBooking.mutateAsync(id);
      toast.success("Agendamento excluído");
      setDetailBooking(null);
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  const activeServices = services?.filter(s => s.active) || [];

  return (
    <DashboardLayout title="Agendamentos" subtitle="Gerencie sua agenda">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-base sm:text-lg font-semibold text-foreground">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h2>
            <p className="text-xs text-muted-foreground">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
          </div>
          <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-3 py-2 rounded-xl bg-muted/50 text-muted-foreground text-xs font-medium hover:bg-muted transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="space-y-0">
            {timeSlots.map((slot) => {
              const slotBookings = (bookings || []).filter(b => format(new Date(b.start_time), "HH:mm") === slot);
              return (
                <div key={slot} className="flex items-stretch min-h-[44px] group">
                  <span className="w-14 text-[11px] font-medium text-muted-foreground pt-2 shrink-0">{slot}</span>
                  <div className="flex-1 border-t border-border/20 pl-3 py-0.5">
                    {slotBookings.length > 0 ? (
                      slotBookings.map(booking => (
                        <motion.div
                          key={booking.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`rounded-xl p-3 border-l-[3px] ${statusColors[booking.status] || "border-l-muted bg-muted/5"} cursor-pointer hover:shadow-md transition-all mb-1`}
                          onClick={() => setDetailBooking(booking)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {booking.client_name || booking.clients?.name || "—"}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {booking.services?.name || "—"} • {booking.duration_minutes}min • R$ {Number(booking.price).toFixed(2)}
                              </p>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                              booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                              booking.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                              booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {statusLabels[booking.status]}
                            </span>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div
                        onClick={() => openCreate(slot)}
                        className="h-full min-h-[36px] rounded-xl hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
                      >
                        <Plus size={14} className="text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {!bookings?.length && (
            <p className="text-center text-muted-foreground text-sm mt-4 pb-2">Nenhum agendamento para este dia</p>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              Novo Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Serviço *</Label>
              <Select value={formService} onValueChange={setFormService}>
                <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                <SelectContent>
                  {activeServices.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} — {s.duration_minutes}min • R$ {Number(s.price).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeServices.length === 0 && (
                <p className="text-xs text-destructive mt-1">Cadastre serviços primeiro na aba Serviços</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Horário *</Label>
              <Select value={formTime} onValueChange={setFormTime}>
                <SelectTrigger><SelectValue placeholder="Selecione o horário" /></SelectTrigger>
                <SelectContent>
                  {timeSlots.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Nome do cliente *</Label>
              <Input
                placeholder="Nome completo"
                value={formClientName}
                onChange={e => setFormClientName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={formClientPhone}
                onChange={e => setFormClientPhone(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Status</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Observações</Label>
              <Textarea
                placeholder="Notas sobre o agendamento..."
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={createBooking.isPending}
              className="w-full"
            >
              {createBooking.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              Criar Agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="sm:max-w-md">
          {detailBooking && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User size={18} className="text-primary" />
                  {detailBooking.client_name || detailBooking.clients?.name || "Cliente"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Serviço</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Scissors size={13} className="text-primary" />
                      {detailBooking.services?.name || "—"}
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Horário</p>
                    <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Clock size={13} className="text-primary" />
                      {format(new Date(detailBooking.start_time), "HH:mm")} - {format(new Date(detailBooking.end_time), "HH:mm")}
                    </p>
                  </div>
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Valor</p>
                    <p className="text-sm font-semibold text-foreground">R$ {Number(detailBooking.price).toFixed(2)}</p>
                  </div>
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Duração</p>
                    <p className="text-sm font-medium text-foreground">{detailBooking.duration_minutes} min</p>
                  </div>
                </div>

                {(detailBooking.client_phone || detailBooking.clients?.phone) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone size={14} />
                    {detailBooking.client_phone || detailBooking.clients?.phone}
                  </div>
                )}

                {detailBooking.notes && (
                  <div className="glass-card rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Observações</p>
                    <p className="text-sm text-foreground">{detailBooking.notes}</p>
                  </div>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5">Alterar Status</Label>
                  <Select value={detailBooking.status} onValueChange={v => handleStatusChange(detailBooking.id, v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => handleDelete(detailBooking.id)}
                  disabled={deleteBooking.isPending}
                  className="w-full"
                >
                  {deleteBooking.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : <Trash2 size={14} className="mr-2" />}
                  Excluir Agendamento
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Bookings;
