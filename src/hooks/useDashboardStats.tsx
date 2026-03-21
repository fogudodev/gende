import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, subDays } from "date-fns";

export const useDashboardStats = () => {
  const { data: professional } = useProfessional();
  const today = new Date();

  return useQuery({
    queryKey: ["dashboard-stats", professional?.id],
    queryFn: async () => {
      const pid = professional!.id;
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const lastMonthStart = startOfMonth(subMonths(today, 1)).toISOString();
      const lastMonthEnd = endOfMonth(subMonths(today, 1)).toISOString();
      const yesterdayStart = startOfDay(subDays(today, 1)).toISOString();
      const yesterdayEnd = endOfDay(subDays(today, 1)).toISOString();

      const [todayBookings, monthBookings, lastMonthBookings, yesterdayBookings, totalClients, weekClients] = await Promise.all([
        supabase.from("bookings").select("price, status").eq("professional_id", pid)
          .gte("start_time", todayStart).lte("start_time", todayEnd),
        supabase.from("bookings").select("price, status").eq("professional_id", pid)
          .gte("start_time", monthStart).lte("start_time", monthEnd)
          .in("status", ["confirmed", "completed"]),
        supabase.from("bookings").select("price, status").eq("professional_id", pid)
          .gte("start_time", lastMonthStart).lte("start_time", lastMonthEnd)
          .in("status", ["confirmed", "completed"]),
        supabase.from("bookings").select("price, status").eq("professional_id", pid)
          .gte("start_time", yesterdayStart).lte("start_time", yesterdayEnd)
          .in("status", ["confirmed", "completed"]),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("professional_id", pid),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("professional_id", pid)
          .gte("created_at", subDays(today, 7).toISOString()),
      ]);

      const todayRevenue = (todayBookings.data || [])
        .filter(b => b.status === "confirmed" || b.status === "completed")
        .reduce((s, b) => s + Number(b.price), 0);

      const yesterdayRevenue = (yesterdayBookings.data || [])
        .reduce((s, b) => s + Number(b.price), 0);

      const monthRevenue = (monthBookings.data || []).reduce((s, b) => s + Number(b.price), 0);
      const lastMonthRevenue = (lastMonthBookings.data || []).reduce((s, b) => s + Number(b.price), 0);

      const todayCount = (todayBookings.data || []).length;
      const todayPending = (todayBookings.data || []).filter(b => b.status === "pending").length;

      const revenueTodayChange = yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;

      const revenueMonthChange = lastMonthRevenue > 0
        ? Math.round(((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      return {
        todayRevenue,
        monthRevenue,
        todayCount,
        todayPending,
        totalClients: totalClients.count || 0,
        weekClients: weekClients.count || 0,
        revenueTodayChange,
        revenueMonthChange,
      };
    },
    enabled: !!professional?.id,
    refetchInterval: 60000,
  });
};
