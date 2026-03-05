import { useState, useEffect } from "react";
import { useEmployeeWorkingHours, useUpsertEmployeeWorkingHours } from "@/hooks/useEmployeeWorkingHours";
import { useWorkingHours, getDayName } from "@/hooks/useWorkingHours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Clock, Copy, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  employeeId: string;
  employeeName: string;
}

type DayRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

const defaultDays = (): DayRow[] =>
  Array.from({ length: 7 }, (_, i) => ({
    day_of_week: i,
    start_time: "09:00",
    end_time: "18:00",
    is_active: i >= 1 && i <= 5,
  }));

const EmployeeWorkingHours = ({ employeeId, employeeName }: Props) => {
  const [open, setOpen] = useState(false);
  const { data: hours, isLoading } = useEmployeeWorkingHours(open ? employeeId : undefined);
  const { data: salonHours } = useWorkingHours();
  const upsert = useUpsertEmployeeWorkingHours();
  const [days, setDays] = useState<DayRow[]>(defaultDays());

  useEffect(() => {
    if (hours && hours.length > 0) {
      const mapped = defaultDays().map(d => {
        const found = hours.find(h => h.day_of_week === d.day_of_week);
        return found
          ? { day_of_week: found.day_of_week, start_time: found.start_time.slice(0, 5), end_time: found.end_time.slice(0, 5), is_active: found.is_active }
          : d;
      });
      setDays(mapped);
    } else if (hours && hours.length === 0 && salonHours) {
      // Pre-fill from salon hours
      const mapped = defaultDays().map(d => {
        const found = salonHours.find(h => h.day_of_week === d.day_of_week);
        return found
          ? { day_of_week: found.day_of_week, start_time: found.start_time.slice(0, 5), end_time: found.end_time.slice(0, 5), is_active: found.is_active }
          : d;
      });
      setDays(mapped);
    }
  }, [hours, salonHours]);

  const updateDay = (idx: number, field: keyof DayRow, value: any) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const copyFromSalon = () => {
    if (!salonHours) return;
    const mapped = defaultDays().map(d => {
      const found = salonHours.find(h => h.day_of_week === d.day_of_week);
      return found
        ? { day_of_week: found.day_of_week, start_time: found.start_time.slice(0, 5), end_time: found.end_time.slice(0, 5), is_active: found.is_active }
        : { ...d, is_active: false };
    });
    setDays(mapped);
    toast.info("Horários do salão copiados");
  };

  const handleSave = () => {
    upsert.mutate(
      { employeeId, hours: days },
      {
        onSuccess: () => {
          toast.success(`Horários de ${employeeName} salvos`);
          setOpen(false);
        },
        onError: () => toast.error("Erro ao salvar horários"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="mt-2 flex items-center gap-1.5 text-xs text-accent hover:underline">
          <Clock size={12} /> Horários de trabalho
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Horários — {employeeName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" size="sm" onClick={copyFromSalon} className="gap-1.5 text-xs">
              <Copy size={12} /> Copiar horários do salão
            </Button>

            <div className="space-y-2">
              {days.map((day, idx) => (
                <div key={day.day_of_week} className="flex items-center gap-3">
                  <div className="w-20">
                    <Switch
                      checked={day.is_active}
                      onCheckedChange={(v) => updateDay(idx, "is_active", v)}
                    />
                  </div>
                  <span className="w-20 text-sm font-medium text-foreground">
                    {getDayName(day.day_of_week)}
                  </span>
                  {day.is_active ? (
                    <>
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => updateDay(idx, "start_time", e.target.value)}
                        className="w-28 text-sm"
                      />
                      <span className="text-muted-foreground text-xs">até</span>
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => updateDay(idx, "end_time", e.target.value)}
                        className="w-28 text-sm"
                      />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Folga</span>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={upsert.isPending} className="w-full gap-1.5">
              {upsert.isPending ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Salvar Horários
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeWorkingHours;
