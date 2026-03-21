import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";

export type WaitlistOffer = {
  id: string;
  professional_id: string;
  waitlist_entry_id: string | null;
  booking_id: string | null;
  client_name: string;
  client_phone: string;
  service_id: string | null;
  slot_start: string;
  slot_end: string;
  status: string;
  reserved_until: string | null;
  responded_at: string | null;
  created_booking_id: string | null;
  created_at: string;
};

export const useWaitlistOffers = (limit = 100) => {
  const { data: professional } = useProfessional();

  return useQuery({
    queryKey: ["waitlist-offers", professional?.id, limit],
    queryFn: async () => {
      const { data, error } = await api
        .from("waitlist_offers" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as WaitlistOffer[];
    },
    enabled: !!professional?.id,
  });
};

export const useWaitlistMetrics = () => {
  const { data: offers } = useWaitlistOffers(500);

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOffers = (offers || []).filter(
    (o) => new Date(o.created_at) >= thirtyDaysAgo
  );

  const totalSent = recentOffers.length;
  const accepted = recentOffers.filter((o) => o.status === "accepted").length;
  const expired = recentOffers.filter((o) => o.status === "expired" || o.status === "slot_taken").length;

  return {
    totalSent,
    accepted,
    expired,
    conversionRate: totalSent > 0 ? Math.round((accepted / totalSent) * 100) : 0,
    recentOffers,
  };
};
