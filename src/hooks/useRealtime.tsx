/**
 * useRealtime Hook
 * 
 * Unified hook that works with both Supabase Realtime and PHP WebSocket.
 * Falls back to polling when WebSocket is unavailable.
 * 
 * Usage:
 *   useRealtime('bookings', { event: '*' }, (payload) => {
 *     queryClient.invalidateQueries({ queryKey: ['bookings'] });
 *   });
 */

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isPhpBackend } from "@/lib/backend-config";
import { supabase } from "@/integrations/supabase/client";
import { phpRealtime } from "@/lib/php-realtime";

interface RealtimeOptions {
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  /** Query keys to invalidate on change */
  invalidateKeys?: string[][];
}

/**
 * Subscribe to realtime changes on a table.
 * Works with both Supabase and PHP WebSocket backends.
 */
export function useRealtime(
  table: string,
  options: RealtimeOptions = {},
  callback?: (payload: any) => void
) {
  const queryClient = useQueryClient();
  const { event = "*", schema = "public", invalidateKeys } = options;
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handleChange = (payload: any) => {
      // Call custom callback
      callbackRef.current?.(payload);

      // Auto-invalidate queries
      if (invalidateKeys) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
    };

    if (isPhpBackend()) {
      // PHP WebSocket
      const subscription = phpRealtime
        .channel(table)
        .on("postgres_changes", { event, schema, table }, handleChange)
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Supabase Realtime
      const channel = supabase
        .channel(`${table}-changes`)
        .on(
          "postgres_changes" as any,
          { event, schema, table },
          handleChange
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [table, event, schema, queryClient, invalidateKeys]);
}

/**
 * useRealtimePolling - Fallback for when WebSocket is unavailable
 * 
 * Simply uses React Query's refetchInterval for periodic data fetching.
 * Already built into React Query, just pass refetchInterval to useQuery.
 * 
 * Example:
 *   useQuery({
 *     queryKey: ['bookings'],
 *     queryFn: fetchBookings,
 *     refetchInterval: isPhpBackend() ? 5000 : undefined, // Poll every 5s on PHP
 *   });
 */
