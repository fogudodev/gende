import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useProfessional } from "./useProfessional";

export const useCampaigns = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["campaigns", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("campaigns")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useCampaignLimits = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["campaign-limits", professional?.id],
    queryFn: async () => {
      const { data, error } = await api.functions.invoke("send-campaign", {
        body: { action: "get-limits", professionalId: professional!.id },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useSendCampaign = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { professionalId: string; name: string; message: string; clientIds?: string[] }) => {
      const { data, error } = await api.functions.invoke("send-campaign", {
        body: { action: "create-campaign", ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-limits"] });
    },
  });
};

export const useAddonPurchases = () => {
  const { data: professional } = useProfessional();
  return useQuery({
    queryKey: ["addon-purchases", professional?.id],
    queryFn: async () => {
      const { data, error } = await api
        .from("addon_purchases")
        .select("*")
        .eq("professional_id", professional!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!professional?.id,
  });
};

export const useCampaignContacts = (campaignId: string | null) => {
  return useQuery({
    queryKey: ["campaign-contacts", campaignId],
    queryFn: async () => {
      const { data, error } = await api
        .from("campaign_contacts")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });
};

export const usePlanLimits = () => {
  return useQuery({
    queryKey: ["plan-limits-all"],
    queryFn: async () => {
      const { data, error } = await api
        .from("plan_limits")
        .select("*")
        .order("plan_id");
      if (error) throw error;
      return data;
    },
  });
};

export const useUpdatePlanLimits = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; daily_reminders: number; daily_campaigns: number; campaign_max_contacts: number; campaign_min_interval_hours: number }) => {
      const { id, ...updates } = params;
      const { error } = await api
        .from("plan_limits")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-limits-all"] });
    },
  });
};
