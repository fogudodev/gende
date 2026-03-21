import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

export interface Commission {
  id: string;
  professional_id: string;
  employee_id: string;
  booking_id: string | null;
  booking_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export const useCommissions = (employeeId?: string, status?: string) => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["commissions", professional?.id, employeeId, status],
    queryFn: async () => {
      let query = supabase
        .from("commissions")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (employeeId) query = query.eq("employee_id", employeeId);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as Commission[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateCommission = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (commission: Omit<Commission, "id" | "professional_id" | "created_at" | "paid_at">) => {
      const { data, error } = await supabase
        .from("commissions")
        .insert({ ...commission, professional_id: professional!.id })
        .select()
        .single();
      if (error) throw error;

      // Send WhatsApp notification (fire-and-forget)
      supabase.functions.invoke("whatsapp", {
        body: {
          action: "notify-commission",
          professionalId: professional!.id,
          employeeId: commission.employee_id,
          commissionAmount: commission.commission_amount,
          bookingAmount: commission.booking_amount,
          percentage: commission.commission_percentage,
        },
      }).catch(() => {}); // non-blocking

      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};

export const usePayCommission = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      // Get commissions to calculate totals per employee
      const { data: comms, error: fetchErr } = await supabase
        .from("commissions")
        .select("employee_id, commission_amount")
        .in("id", ids);
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from("commissions")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;

      // Aggregate totals per employee for notification
      if (comms && professional?.id) {
        const empTotals: Record<string, number> = {};
        comms.forEach((c) => {
          empTotals[c.employee_id] = (empTotals[c.employee_id] || 0) + c.commission_amount;
        });

        // Send payment notifications (fire-and-forget, one per employee)
        for (const [empId, total] of Object.entries(empTotals)) {
          supabase.functions.invoke("whatsapp", {
            body: {
              action: "notify-commission-paid",
              professionalId: professional.id,
              employeeIds: [empId],
              totalAmount: total,
            },
          }).catch(() => {});
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); toast.success("Comissões pagas!"); },
    onError: (e: Error) => toast.error("Erro: " + e.message),
  });
};
