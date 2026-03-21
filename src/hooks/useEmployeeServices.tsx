import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

export const useEmployeeServices = (employeeId?: string) => {
  return useQuery({
    queryKey: ["employee-services", employeeId],
    queryFn: async () => {
      const { data, error } = await api
        .from("employee_services")
        .select("*, services(id, name, price, duration_minutes, category)")
        .eq("employee_id", employeeId!);
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });
};

export const useAllEmployeeServices = (salonId?: string) => {
  return useQuery({
    queryKey: ["all-employee-services", salonId],
    queryFn: async () => {
      const { data, error } = await api
        .from("employee_services")
        .select("employee_id, service_id");
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });
};

export const useToggleEmployeeService = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ employeeId, serviceId, assigned }: { employeeId: string; serviceId: string; assigned: boolean }) => {
      if (assigned) {
        // Remove
        const { error } = await api
          .from("employee_services")
          .delete()
          .eq("employee_id", employeeId)
          .eq("service_id", serviceId);
        if (error) throw error;
      } else {
        // Add
        const { error } = await api
          .from("employee_services")
          .insert({ employee_id: employeeId, service_id: serviceId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employee-services"] });
      qc.invalidateQueries({ queryKey: ["all-employee-services"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar serviço: " + error.message);
    },
  });
};
