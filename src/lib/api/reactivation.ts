import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

export function useReactivationMetrics() {
  return useQuery({
    queryKey: ['reactivationMetrics'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/reactivation/metrics`, { headers });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return res.json();
    }
  });
}

export function useAnalyzedCustomers() {
  return useQuery({
    queryKey: ['analyzedCustomers'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/reactivation/customers/analyze`, { headers });
      if (!res.ok) throw new Error('Failed to fetch customers');
      return res.json();
    }
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; messageTemplate: string; segmentFilter?: any }) => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/reactivation/campaigns`, {
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
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    }
  });
}

export function useExecuteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const headers = await getAuthHeader();
      const res = await fetch(`${API_URL}/reactivation/campaigns/${campaignId}/execute`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Failed to execute campaign');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['reactivationMetrics'] });
    }
  });
}
