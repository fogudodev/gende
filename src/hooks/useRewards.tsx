import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────
export type LoyaltyConfig = {
  id: string;
  professional_id: string;
  cashback_enabled: boolean;
  default_cashback_percent: number;
  levels_enabled: boolean;
  referral_enabled: boolean;
  referral_reward_amount: number;
  referral_new_client_bonus: number;
  challenges_enabled: boolean;
};

export type CashbackRule = {
  id: string;
  professional_id: string;
  name: string;
  rule_type: string;
  cashback_percent: number;
  service_id: string | null;
  start_hour: string | null;
  end_hour: string | null;
  is_active: boolean;
  created_at: string;
};

export type ClientCashback = {
  id: string;
  client_id: string;
  professional_id: string;
  balance: number;
  total_earned: number;
  total_used: number;
};

export type CashbackTransaction = {
  id: string;
  client_id: string;
  professional_id: string;
  booking_id: string | null;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
};

export type LoyaltyLevel = {
  id: string;
  professional_id: string;
  name: string;
  min_visits: number;
  min_spent: number;
  cashback_bonus_percent: number;
  sort_order: number;
  color: string;
  benefits: string[];
};

export type ClientLoyalty = {
  id: string;
  client_id: string;
  professional_id: string;
  level_id: string | null;
  total_visits: number;
  total_spent: number;
  referral_count: number;
  last_visit_at: string | null;
  avg_days_between_visits: number | null;
  retention_status: string;
};

export type ClientReferral = {
  id: string;
  professional_id: string;
  referrer_client_id: string;
  referred_client_id: string | null;
  referral_code: string;
  status: string;
  reward_amount: number;
  created_at: string;
  completed_at: string | null;
};

export type LoyaltyChallenge = {
  id: string;
  professional_id: string;
  title: string;
  description: string | null;
  challenge_type: string;
  target_value: number;
  reward_type: string;
  reward_value: number;
  reward_description: string | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

export type ChallengeProgress = {
  id: string;
  challenge_id: string;
  client_id: string;
  professional_id: string;
  current_value: number;
  completed: boolean;
  reward_claimed: boolean;
};

// ─── Hooks ───────────────────────────────────────────────────────

export const useLoyaltyConfig = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["loyalty-config", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("loyalty_config" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as LoyaltyConfig | null;
    },
    enabled: !!professional?.id,
  });
};

export const useSaveLoyaltyConfig = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (config: Partial<LoyaltyConfig>) => {
      const { error } = await api
        .from("loyalty_config" as any)
        .upsert(
          { ...config, professional_id: professional!.id, updated_at: new Date().toISOString() } as any,
          { onConflict: "professional_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-config"] });
      toast.success("Configuração salva");
    },
    onError: () => toast.error("Erro ao salvar configuração"),
  });
};

export const useCashbackRules = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["cashback-rules", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("cashback_rules" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CashbackRule[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateCashbackRule = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (rule: Partial<CashbackRule>) => {
      const { error } = await api
        .from("cashback_rules" as any)
        .insert({ ...rule, professional_id: professional!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashback-rules"] });
      toast.success("Regra criada");
    },
    onError: () => toast.error("Erro ao criar regra"),
  });
};

export const useToggleCashbackRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await api
        .from("cashback_rules" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashback-rules"] });
    },
  });
};

export const useDeleteCashbackRule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("cashback_rules" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cashback-rules"] });
      toast.success("Regra removida");
    },
    onError: () => toast.error("Erro ao remover regra"),
  });
};

export const useClientCashbacks = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["client-cashbacks", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("client_cashback" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("balance", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientCashback[];
    },
    enabled: !!professional?.id,
  });
};

export const useCashbackTransactions = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["cashback-transactions", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("cashback_transactions" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as unknown as CashbackTransaction[];
    },
    enabled: !!professional?.id,
  });
};

export const useLoyaltyLevels = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["loyalty-levels", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("loyalty_levels" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LoyaltyLevel[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateLoyaltyLevel = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (level: Partial<LoyaltyLevel>) => {
      const { error } = await api
        .from("loyalty_levels" as any)
        .insert({ ...level, professional_id: professional!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-levels"] });
      toast.success("Nível criado");
    },
    onError: () => toast.error("Erro ao criar nível"),
  });
};

export const useDeleteLoyaltyLevel = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("loyalty_levels" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-levels"] });
      toast.success("Nível removido");
    },
    onError: () => toast.error("Erro ao remover nível"),
  });
};

export const useClientLoyalties = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["client-loyalties", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("client_loyalty" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("total_spent", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientLoyalty[];
    },
    enabled: !!professional?.id,
  });
};

export const useClientReferrals = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["client-referrals", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("client_referrals" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClientReferral[];
    },
    enabled: !!professional?.id,
  });
};

export const useLoyaltyChallenges = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["loyalty-challenges", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("loyalty_challenges" as any)
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LoyaltyChallenge[];
    },
    enabled: !!professional?.id,
  });
};

export const useCreateChallenge = () => {
  const qc = useQueryClient();
  const { data: professional } = useProfessional();
  return useMutation({
    mutationFn: async (challenge: Partial<LoyaltyChallenge>) => {
      const { error } = await api
        .from("loyalty_challenges" as any)
        .insert({ ...challenge, professional_id: professional!.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-challenges"] });
      toast.success("Desafio criado");
    },
    onError: () => toast.error("Erro ao criar desafio"),
  });
};

export const useToggleChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await api
        .from("loyalty_challenges" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-challenges"] });
    },
  });
};

export const useDeleteChallenge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api
        .from("loyalty_challenges" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["loyalty-challenges"] });
      toast.success("Desafio removido");
    },
    onError: () => toast.error("Erro ao remover desafio"),
  });
};

export const useChallengeProgress = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["challenge-progress", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("challenge_progress" as any)
        .select("*")
        .eq("professional_id", professional!.id);
      if (error) throw error;
      return (data || []) as unknown as ChallengeProgress[];
    },
    enabled: !!professional?.id,
  });
};

// ─── Dashboard Stats ─────────────────────────────────────────────
export const useRewardsDashboardStats = () => {
  const { data: cashbacks } = useClientCashbacks();
  const { data: transactions } = useCashbackTransactions();
  const { data: loyalties } = useClientLoyalties();
  const { data: referrals } = useClientReferrals();
  const { data: challenges } = useLoyaltyChallenges();

  const totalCashbackGiven = cashbacks?.reduce((sum, c) => sum + c.total_earned, 0) || 0;
  const totalCashbackUsed = cashbacks?.reduce((sum, c) => sum + c.total_used, 0) || 0;
  const totalActiveBalance = cashbacks?.reduce((sum, c) => sum + c.balance, 0) || 0;
  const clientsWithCashback = cashbacks?.filter((c) => c.balance > 0).length || 0;

  const atRiskClients = loyalties?.filter((l) => l.retention_status === "at_risk").length || 0;
  const activeClients = loyalties?.filter((l) => l.retention_status === "active").length || 0;
  const lostClients = loyalties?.filter((l) => l.retention_status === "lost").length || 0;
  const totalReferrals = referrals?.filter((r) => r.status === "completed").length || 0;
  const activeChallenges = challenges?.filter((c) => c.is_active).length || 0;

  return {
    totalCashbackGiven,
    totalCashbackUsed,
    totalActiveBalance,
    clientsWithCashback,
    atRiskClients,
    activeClients,
    lostClients,
    totalReferrals,
    activeChallenges,
  };
};
