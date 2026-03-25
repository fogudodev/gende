import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { PHP_API_URL, isPhpBackend } from '@/lib/backend-config';
import { supabase } from '@/integrations/supabase/client';
import { getAccessToken } from '@/lib/php-client';

async function getAuthHeader() {
  if (isPhpBackend()) {
    const token = getAccessToken();
    return { Authorization: `Bearer ${token}` };
  }
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
}

function getBaseUrl() {
  return isPhpBackend() ? PHP_API_URL : ((import.meta as any).env.VITE_API_URL || 'http://localhost:3001');
}

export function useReactivationMetrics() {
  return useQuery({
    queryKey: ['reactivationMetrics'],
    queryFn: async () => {
      const headers = await getAuthHeader();
      const res = await fetch(`${getBaseUrl()}/reactivation/metrics`, { headers });
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
      const res = await fetch(`${getBaseUrl()}/reactivation/customers/analyze`, { headers });
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
      const res = await fetch(`${getBaseUrl()}/reactivation/campaigns`, {
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
      const res = await fetch(`${getBaseUrl()}/reactivation/campaigns/${campaignId}/execute`, {
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
