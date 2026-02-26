import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import {
  Plus, ChevronLeft, ChevronRight, Loader2, Clock, User, Scissors,
  Trash2, Phone, CalendarDays, CalendarRange, List, Ban, Coins,
} from "lucide-react";
import {
  useBookings, useBookingsWeek, useBookingsMonth,
  useCreateBooking, useUpdateBooking, useDeleteBooking,
  getAvailableSlots,
} from "@/hooks/useBookings";
import { useServices } from "@/hooks/useServices";
import { useBlockedTimes } from "@/hooks/useBlockedTimes";
import { useCommissions } from "@/hooks/useCommissions";
import {
  format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  setHours, setMinutes, startOfWeek, eachDayOfInterval, endOfWeek,
  isSameDay, getDaysInMonth, startOfMonth, getDay, isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ViewMode = "day" | "week" | "month";

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

const statusBadgeClass: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  completed: "bg-blue-500/20 text-blue-400",
  cancelled: "bg-red-500/20 text-red-400",
  no_show: "bg-gray-500/20 text-gray-400",
};

const DAY_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7-21

const Bookings = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [showCreate, setShowCreate] = useState(false);
  const [detailBooking, setDetailBooking] = useState<any>(null);

  // Data fetching
  const { data: dayBookings, isLoading: dayLoading } = useBookings(selectedDate);
  const { data: weekBookings, isLoading: weekLoading } = useBookingsWeek(selectedDate);
  const { data: monthBookings, isLoading: monthLoading } = useBookingsMonth(selectedDate);
  const { data: services } = useServices();
  const { data: blockedTimes } = useBlockedTimes();
  const { data: commissions } = useCommissions();
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();

  // Set of booking IDs that have auto-generated commissions
  const bookingIdsWithCommission = useMemo(() => {
    const set = new Set<string>();
    commissions?.forEach((c) => { if (c.booking_id) set.add(c.booking_id); });
    return set;
  }, [commissions]);

  // Form state
  const [formService, setFormService] = useState("");
  const [formTime, setFormTime] = useState("");
  const [formClientName, setFormClientName] = useState("");
  const [formClientPhone, setFormClientPhone] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState("confirmed");
  const [formDate, setFormDate] = useState(selectedDate);

  const activeServices = services?.filter(s => s.active) || [];
  const selectedService = activeServices.find(s => s.id === formService);

  // Available time slots considering existing bookings + 10min buffer
  const availableSlots = useMemo(() => {
    if (!selectedService || !dayBookings) return [];
    const bookingsForDate = (viewMode === "day" ? dayBookings : (weekBookings || monthBookings || []))
      ?.filter(b => isSameDay(new Date(b.start_time), formDate)) || [];
    return getAvailableSlots(bookingsForDate, selectedService.duration_minutes, 7, 21, 10, blockedTimes || [], formDate);
  }, [selectedService, dayBookings, weekBookings, monthBookings, formDate, viewMode, blockedTimes]);

  const resetForm = () => {
    setFormService("");
    setFormTime("");
    setFormClientName("");
    setFormClientPhone("");
    setFormNotes("");
    setFormStatus("confirmed");
    setFormDate(selectedDate);
  };

  const openCreate = (slot?: string, date?: Date) => {
    resetForm();
    if (date) setFormDate(date);
    else setFormDate(selectedDate);
    if (slot) setFormTime(slot);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!formService || !formTime || !formClientName) {
      toast.error("Preencha serviço, horário e nome do cliente");
      return;
    }
    if (!selectedService) return;

    const [h, m] = formTime.split(":").map(Number);
    const startTime = setMinutes(setHours(formDate, h), m);
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);

    try {
      await createBooking.mutateAsync({
        service_id: formService,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        client_name: formClientName,
        client_phone: formClientPhone,
        notes: formNotes,
        status: formStatus as any,
        price: selectedService.price,
        duration_minutes: selectedService.duration_minutes,
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

  // Navigation
  const navigate = (dir: -1 | 1) => {
    if (viewMode === "day") setSelectedDate(d => dir === 1 ? addDays(d, 1) : subDays(d, 1));
    else if (viewMode === "week") setSelectedDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setSelectedDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
  };

  const headerLabel = () => {
    if (viewMode === "day") return format(selectedDate, "dd 'de' MMMM", { locale: ptBR });
    if (viewMode === "week") {
      const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const we = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(ws, "dd")} - ${format(we, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return format(selectedDate, "MMMM yyyy", { locale: ptBR });
  };

  const isLoading = viewMode === "day" ? dayLoading : viewMode === "week" ? weekLoading : monthLoading;
  const currentBookings = viewMode === "day" ? dayBookings : viewMode === "week" ? weekBookings : monthBookings;

  // Week days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });
  }, [selectedDate]);

  // Month grid
  const monthGrid = useMemo(() => {
    const ms = startOfMonth(selectedDate);
    const daysInMonth = getDaysInMonth(selectedDate);
    const startDow = (getDay(ms) + 6) % 7; // Monday=0
    const cells: (Date | null)[] = Array(startDow).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i));
    }
    return cells;
  }, [selectedDate]);

  return (
    <DashboardLayout title="Agendamentos" subtitle="Gerencie sua agenda">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <ChevronLeft size={18} className="text-muted-foreground" />
          </button>
          <div className="text-center min-w-[160px]">
            <h2 className="text-base sm:text-lg font-semibold text-foreground capitalize">{headerLabel()}</h2>
            {viewMode === "day" && (
              <p className="text-xs text-muted-foreground capitalize">{format(selectedDate, "EEEE", { locale: ptBR })}</p>
            )}
          </div>
          <button onClick={() => navigate(1)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors">
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as ViewMode)} className="flex-1 sm:flex-none">
            <TabsList className="h-9 bg-muted/50">
              <TabsTrigger value="day" className="text-xs px-3 gap-1">
                <List size={13} /> Dia
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-3 gap-1">
                <CalendarRange size={13} /> Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-3 gap-1">
                <CalendarDays size={13} /> Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
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

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-muted-foreground" size={32} />
        </div>
      ) : viewMode === "day" ? (
        <DayView
          bookings={dayBookings || []}
          blockedTimes={blockedTimes || []}
          selectedDate={selectedDate}
          onSlotClick={slot => openCreate(slot)}
          onBookingClick={setDetailBooking}
          commissionBookingIds={bookingIdsWithCommission}
        />
      ) : viewMode === "week" ? (
        <WeekView
          days={weekDays}
          bookings={weekBookings || []}
          blockedTimes={blockedTimes || []}
          onDayClick={d => { setSelectedDate(d); setViewMode("day"); }}
          onBookingClick={setDetailBooking}
          onSlotClick={(slot, date) => openCreate(slot, date)}
        />
      ) : (
        <MonthView
          grid={monthGrid}
          bookings={monthBookings || []}
          blockedTimes={blockedTimes || []}
          selectedDate={selectedDate}
          onDayClick={d => { setSelectedDate(d); setViewMode("day"); }}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              Novo Agendamento — {format(formDate, "dd/MM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Serviço *</Label>
              <Select value={formService} onValueChange={v => { setFormService(v); setFormTime(""); }}>
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
                <p className="text-xs text-destructive mt-1">Cadastre serviços primeiro</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">
                Horário disponível * {selectedService && <span className="text-primary">({selectedService.duration_minutes}min + 10min buffer)</span>}
              </Label>
              {!formService ? (
                <p className="text-xs text-muted-foreground italic">Selecione um serviço primeiro</p>
              ) : availableSlots.length === 0 ? (
                <p className="text-xs text-destructive">Nenhum horário disponível para este dia</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-[160px] overflow-y-auto p-1">
                  {availableSlots.map(t => (
                    <button
                      key={t}
                      onClick={() => setFormTime(t)}
                      className={`text-xs py-2 px-1 rounded-lg border transition-all font-medium ${
                        formTime === t
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/30 text-foreground border-border/30 hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {formTime && selectedService && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  ⏱ {formTime} → {(() => {
                    const [h, m] = formTime.split(":").map(Number);
                    const end = h * 60 + m + selectedService.duration_minutes;
                    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                  })()} (próximo disponível: {(() => {
                    const [h, m] = formTime.split(":").map(Number);
                    const end = h * 60 + m + selectedService.duration_minutes + 10;
                    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                  })()})
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Nome do cliente *</Label>
              <Input placeholder="Nome completo" value={formClientName} onChange={e => setFormClientName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5">Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={formClientPhone} onChange={e => setFormClientPhone(e.target.value)} />
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
              <Textarea placeholder="Notas..." value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2} />
            </div>
            <Button onClick={handleCreate} disabled={createBooking.isPending} className="w-full">
              {createBooking.isPending && <Loader2 className="animate-spin mr-2" size={16} />}
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
                {bookingIdsWithCommission.has(detailBooking.id) && (
                  <div className="glass-card rounded-xl p-3 border border-accent/20 bg-accent/5">
                    <div className="flex items-center gap-2">
                      <Coins size={14} className="text-accent" />
                      <p className="text-xs font-medium text-accent">Comissão gerada automaticamente</p>
                    </div>
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
                <Button variant="destructive" onClick={() => handleDelete(detailBooking.id)} disabled={deleteBooking.isPending} className="w-full">
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

// Helper: get blocked times affecting a specific hour on a specific date
const getBlockedForHour = (blockedTimes: any[], date: Date, hour: number) => {
  return blockedTimes.filter(bt => {
    const btStart = new Date(bt.start_time);
    const btEnd = new Date(bt.end_time);
    const hourStart = new Date(date);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(date);
    hourEnd.setHours(hour, 59, 59, 999);
    return btStart <= hourEnd && btEnd >= hourStart;
  });
};

// Helper: check if a day has any blocked time
const getBlockedForDay = (blockedTimes: any[], date: Date) => {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return blockedTimes.filter(bt => {
    const btStart = new Date(bt.start_time);
    const btEnd = new Date(bt.end_time);
    return btStart <= dayEnd && btEnd >= dayStart;
  });
};

// ─── Day View ───
const HOUR_HEIGHT = 64; // px per hour slot

const DayView = ({ bookings, blockedTimes, selectedDate, onSlotClick, onBookingClick, commissionBookingIds }: {
  bookings: any[]; blockedTimes: any[]; selectedDate: Date; onSlotClick: (slot: string) => void; onBookingClick: (b: any) => void; commissionBookingIds: Set<string>;
}) => {
  const startHour = DAY_HOURS[0]; // 7

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 overflow-hidden">
      <div className="relative" style={{ marginLeft: "56px" }}>
        {/* Hour labels + grid lines */}
        {DAY_HOURS.map(hour => {
          const hourStr = String(hour).padStart(2, "0");
          const top = (hour - startHour) * HOUR_HEIGHT;
          const hourBlocked = getBlockedForHour(blockedTimes, selectedDate, hour);
          const isBlocked = hourBlocked.length > 0;

          return (
            <div
              key={hour}
              className="absolute left-0 right-0 group"
              style={{ top: `${top}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <span
                className="absolute text-[11px] font-medium text-muted-foreground"
                style={{ left: "-56px", top: "4px", width: "48px" }}
              >
                {hourStr}:00
              </span>
              <div className={`absolute inset-0 border-t border-border/20 ${isBlocked ? "bg-red-500/5" : ""}`}>
                {isBlocked && (
                  <div className="flex items-center gap-2 h-full px-3 mx-1 my-1 rounded-xl bg-red-500/10 border border-red-500/20 border-l-[3px] border-l-red-500">
                    <Ban size={13} className="text-red-400 shrink-0" />
                    <span className="text-xs text-red-400 font-medium truncate">
                      {hourBlocked[0]?.reason || "Ausência"}
                    </span>
                  </div>
                )}
                {!isBlocked && (
                  <div
                    onClick={() => onSlotClick(`${hourStr}:00`)}
                    className="h-full rounded-xl hover:bg-muted/20 transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    <Plus size={14} className="text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Booking cards — positioned absolutely to span full duration */}
        {bookings.filter(b => b.status !== "cancelled").map(booking => {
          const bStart = new Date(booking.start_time);
          const bEnd = new Date(booking.end_time);
          const startMin = bStart.getHours() * 60 + bStart.getMinutes();
          const endMin = bEnd.getHours() * 60 + bEnd.getMinutes();
          const topPx = ((startMin - startHour * 60) / 60) * HOUR_HEIGHT + 2;
          const heightPx = ((endMin - startMin) / 60) * HOUR_HEIGHT - 4;
          const startTime = format(bStart, "HH:mm");
          const endTime = format(bEnd, "HH:mm");

          return (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`absolute left-1 right-1 z-10 rounded-xl p-2.5 sm:p-3 border-l-[3px] ${statusColors[booking.status] || "border-l-muted bg-muted/5"} cursor-pointer hover:shadow-md transition-all overflow-hidden`}
              style={{ top: `${topPx}px`, height: `${heightPx}px` }}
              onClick={() => onBookingClick(booking)}
            >
              <div className="flex items-start justify-between gap-1.5 h-full">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {booking.client_name || booking.clients?.name || "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {startTime}-{endTime} • {booking.services?.name || "—"} • R$ {Number(booking.price).toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${statusBadgeClass[booking.status] || "bg-gray-500/20 text-gray-400"}`}>
                    {statusLabels[booking.status]}
                  </span>
                  {commissionBookingIds.has(booking.id) && (
                    <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent/15 text-accent whitespace-nowrap" title="Comissão gerada">
                      <Coins size={10} /> Comissão
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Spacer to define total height */}
        <div style={{ height: `${DAY_HOURS.length * HOUR_HEIGHT}px` }} />
      </div>
      {!bookings.length && !blockedTimes.length && (
        <p className="text-center text-muted-foreground text-sm mt-4 pb-2">Nenhum agendamento para este dia</p>
      )}
    </div>
  );
};

// ─── Week View ───
const WeekView = ({ days, bookings, blockedTimes, onDayClick, onBookingClick, onSlotClick }: {
  days: Date[]; bookings: any[]; blockedTimes: any[]; onDayClick: (d: Date) => void; onBookingClick: (b: any) => void; onSlotClick: (slot: string, date: Date) => void;
}) => {
  return (
    <div className="glass-card rounded-2xl p-4 overflow-x-auto">
      {/* Mobile: stacked cards */}
      <div className="sm:hidden space-y-3">
        {days.map(day => {
          const dayBookings = bookings.filter(b => isSameDay(new Date(b.start_time), day));
          const dayBlocked = getBlockedForDay(blockedTimes, day);
          const isTodayDate = isToday(day);
          return (
            <div key={day.toISOString()} className={`rounded-xl p-3 ${isTodayDate ? "bg-primary/10 border border-primary/30" : "bg-muted/20"}`}>
              <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => onDayClick(day)}>
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{format(day, "EEE", { locale: ptBR })}</p>
                    <p className={`text-lg font-bold ${isTodayDate ? "text-primary" : "text-foreground"}`}>{format(day, "dd")}</p>
                  </div>
                  {dayBlocked.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                      <Ban size={10} /> Ausência
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{dayBookings.length} agendamento{dayBookings.length !== 1 ? "s" : ""}</span>
              </div>
              {dayBlocked.length > 0 && (
                <div className="mb-1">
                  {dayBlocked.slice(0, 1).map(bt => (
                    <div key={bt.id} className="text-xs p-2 rounded-lg border-l-2 border-l-destructive bg-destructive/10 flex items-center gap-1.5">
                      <Ban size={11} className="text-destructive shrink-0" />
                      <span className="text-destructive font-medium truncate">{bt.reason || "Ausência"}</span>
                      <span className="text-muted-foreground text-[10px] ml-auto shrink-0">
                        {format(new Date(bt.start_time), "HH:mm")}-{format(new Date(bt.end_time), "HH:mm")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {dayBookings.length > 0 ? (
                <div className="space-y-1">
                  {dayBookings.slice(0, 3).map(b => (
                    <div
                      key={b.id}
                      onClick={() => onBookingClick(b)}
                      className={`text-xs p-2 rounded-lg border-l-2 cursor-pointer ${statusColors[b.status]}`}
                    >
                      <span className="font-medium text-foreground">{format(new Date(b.start_time), "HH:mm")}</span>
                      <span className="text-muted-foreground"> — {b.client_name || b.clients?.name || "—"}</span>
                    </div>
                  ))}
                  {dayBookings.length > 3 && (
                    <p className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3} mais</p>
                  )}
                </div>
              ) : dayBlocked.length === 0 ? (
                <button
                  onClick={() => onSlotClick("09:00", day)}
                  className="w-full text-xs text-muted-foreground/50 py-2 hover:text-primary transition-colors"
                >
                  + Agendar
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Desktop: grid */}
      <div className="hidden sm:grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayBookings = bookings.filter(b => isSameDay(new Date(b.start_time), day));
          const dayBlocked = getBlockedForDay(blockedTimes, day);
          const isTodayDate = isToday(day);
          return (
            <div key={day.toISOString()} className="min-h-[200px]">
              <div
                onClick={() => onDayClick(day)}
                className={`text-center p-2 rounded-xl cursor-pointer transition-colors mb-2 ${isTodayDate ? "bg-primary/20" : "hover:bg-muted/30"}`}
              >
                <p className="text-[10px] text-muted-foreground uppercase">{format(day, "EEE", { locale: ptBR })}</p>
                <p className={`text-lg font-bold ${isTodayDate ? "text-primary" : "text-foreground"}`}>{format(day, "dd")}</p>
              </div>
              <div className="space-y-1">
                {dayBlocked.map(bt => (
                  <div key={bt.id} className="text-[10px] p-1.5 rounded-lg border-l-2 border-l-destructive bg-destructive/10 truncate flex items-center gap-1">
                    <Ban size={10} className="text-destructive shrink-0" />
                    <span className="text-destructive font-medium truncate">{bt.reason || "Ausência"}</span>
                  </div>
                ))}
                {dayBookings.map(b => (
                  <div
                    key={b.id}
                    onClick={() => onBookingClick(b)}
                    className={`text-[10px] p-1.5 rounded-lg border-l-2 cursor-pointer truncate ${statusColors[b.status]}`}
                  >
                    <span className="font-semibold">{format(new Date(b.start_time), "HH:mm")}</span>
                    <span className="text-muted-foreground"> {b.client_name || b.clients?.name || ""}</span>
                  </div>
                ))}
                {dayBookings.length === 0 && dayBlocked.length === 0 && (
                  <button
                    onClick={() => onSlotClick("09:00", day)}
                    className="w-full text-[10px] text-muted-foreground/30 py-4 hover:text-primary/50 transition-colors"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Month View ───
const MonthView = ({ grid, bookings, blockedTimes, selectedDate, onDayClick }: {
  grid: (Date | null)[]; bookings: any[]; blockedTimes: any[]; selectedDate: Date; onDayClick: (d: Date) => void;
}) => {
  const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dayBookings = bookings.filter(b => isSameDay(new Date(b.start_time), day));
          const dayBlocked = getBlockedForDay(blockedTimes, day);
          const isTodayDate = isToday(day);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`min-h-[60px] sm:min-h-[80px] p-1.5 rounded-xl cursor-pointer transition-colors ${
                isTodayDate ? "bg-primary/15 border border-primary/30" : dayBlocked.length > 0 ? "bg-destructive/5" : "hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-1">
                <p className={`text-xs font-semibold mb-0.5 ${isTodayDate ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </p>
                {dayBlocked.length > 0 && (
                  <Ban size={10} className="text-destructive mb-0.5" />
                )}
              </div>
              {dayBlocked.length > 0 && (
                <div className="text-[9px] px-1 py-0.5 rounded bg-destructive/15 text-destructive font-medium truncate mb-0.5">
                  {dayBlocked[0]?.reason || "Ausência"}
                </div>
              )}
              {dayBookings.length > 0 && (
                <div className="space-y-0.5">
                  {dayBookings.slice(0, dayBlocked.length > 0 ? 1 : 2).map(b => (
                    <div key={b.id} className={`text-[9px] px-1 py-0.5 rounded border-l-2 truncate ${statusColors[b.status]}`}>
                      <span className="font-medium">{format(new Date(b.start_time), "HH:mm")}</span>
                      <span className="hidden sm:inline text-muted-foreground"> {b.client_name || ""}</span>
                    </div>
                  ))}
                  {dayBookings.length > (dayBlocked.length > 0 ? 1 : 2) && (
                    <p className="text-[9px] text-primary font-medium">+{dayBookings.length - (dayBlocked.length > 0 ? 1 : 2)}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Bookings;
