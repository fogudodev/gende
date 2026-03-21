/**
 * Backend Client
 * 
 * Exports a unified client that routes to either Supabase or PHP backend
 * based on the VITE_BACKEND_MODE environment variable.
 * 
 * Usage: import { api } from "@/lib/api-client";
 * Then use `api` exactly like `supabase`:
 *   api.from("services").select("*").eq("professional_id", id)
 */

import { supabase } from "@/integrations/supabase/client";
import { phpClient } from "./php-client";
import { isPhpBackend } from "./backend-config";

/**
 * The unified API client.
 * - In "supabase" mode: returns the Supabase JS client (default)
 * - In "php" mode: returns the PHP REST client with a Supabase-like interface
 * 
 * Cast to typeof supabase so TypeScript uses the Supabase types everywhere.
 * The phpClient implements the same interface at runtime.
 */
export const api = (isPhpBackend() ? phpClient : supabase) as typeof supabase;

/**
 * Helper to get the correct auth interface
 */
export const apiAuth = api.auth;
