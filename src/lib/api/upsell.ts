import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export function useUpsellMetrics() {
  return useQuery({
    queryKey: ['upsellMetrics'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/metrics`, { headers });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    }
  });
}

export function useUpsellOpportunities() {
  return useQuery({
    queryKey: ['upsellOpportunities'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/opportunities`, { headers });
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      return res.json();
    }
  });
}

export function useTriggerOpportunities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/opportunities/trigger`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to trigger opportunities scan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsellOpportunities'] });
      queryClient.invalidateQueries({ queryKey: ['upsellMetrics'] });
    }
  });
}

export function useUpsellCampaigns() {
  return useQuery({
    queryKey: ['upsellCampaigns'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/campaigns`, { headers });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    }
  });
}

export function useCreateUpsellCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; message_template: string; opportunityIds: string[] }) => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/campaigns`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsellCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['upsellOpportunities'] });
    }
  });
}

export function useExecuteUpsellCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/upsell/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to execute campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upsellCampaigns'] });
      queryClient.invalidateQueries({ queryKey: ['upsellMetrics'] });
    }
  });
}
