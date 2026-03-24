/**
 * Backend Configuration
 * 
 * Switch between Lovable Cloud (Supabase) and PHP/MySQL backend.
 * Set VITE_BACKEND_MODE in your environment:
 * - "supabase" (default) = Uses Lovable Cloud
 * - "php" = Uses your self-hosted PHP backend
 */

export type BackendMode = "supabase" | "php";

export const BACKEND_MODE: BackendMode = 
  (import.meta.env.VITE_BACKEND_MODE as BackendMode) || "supabase";

export const PHP_API_URL: string = 
  import.meta.env.VITE_PHP_API_URL || "https://api.gende.io";

export const isPhpBackend = () => BACKEND_MODE === "php";
export const isSupabaseBackend = () => BACKEND_MODE === "supabase";
