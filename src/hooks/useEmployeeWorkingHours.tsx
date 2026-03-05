import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfessional } from "./useProfessional";

export type EmployeeWorkingHour = {
  id: string;
  employee_id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export const useEmployeeWorkingHours = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ["employee-working-hours", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_working_hours" as any)
        .select("*")
        .eq("employee_id", employeeId!)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as EmployeeWorkingHour[];
    },
    enabled: !!employeeId,
  });
};

export const useUpsertEmployeeWorkingHours = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();

  return useMutation({
    mutationFn: async ({ employeeId, hours }: { employeeId: string; hours: Omit<EmployeeWorkingHour, "id" | "employee_id" | "professional_id">[] }) => {
      // Delete existing
      await supabase
        .from("employee_working_hours" as any)
        .delete()
        .eq("employee_id", employeeId);

      if (hours.length > 0) {
        const { error } = await supabase
          .from("employee_working_hours" as any)
          .insert(hours.map((h) => ({
            ...h,
            employee_id: employeeId,
            professional_id: professional!.id,
          })) as any);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["employee-working-hours", vars.employeeId] });
    },
  });
};
