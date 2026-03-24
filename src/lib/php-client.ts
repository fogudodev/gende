/**
 * PHP Backend API Client
 * 
 * Drop-in HTTP client for the PHP/MySQL backend.
 * Handles JWT auth, token refresh, and provides a
 * query-builder-like interface similar to Supabase client.
 */

import { PHP_API_URL } from "./backend-config";
// Lazy import to break circular dependency (php-realtime imports from php-client)
let _phpRealtime: typeof import("./php-realtime")["phpRealtime"] | null = null;
async function getPhpRealtime() {
  if (!_phpRealtime) {
    const mod = await import("./php-realtime");
    _phpRealtime = mod.phpRealtime;
  }
  return _phpRealtime;
}

// ============================================
// Token Management
// ============================================
let accessToken: string | null = localStorage.getItem("php_access_token");
let refreshToken: string | null = localStorage.getItem("php_refresh_token");

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  localStorage.setItem("php_access_token", access);
  localStorage.setItem("php_refresh_token", refresh);
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("php_access_token");
  localStorage.removeItem("php_refresh_token");
}

export function getAccessToken() {
  return accessToken;
}

// ============================================
// Base fetch with auth + auto-refresh
// ============================================
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: Error | null }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  try {
    let res = await fetch(`${PHP_API_URL}${path}`, { ...options, headers });

    // Auto-refresh on 401
    if (res.status === 401 && refreshToken) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        headers["Authorization"] = `Bearer ${accessToken}`;
        res = await fetch(`${PHP_API_URL}${path}`, { ...options, headers });
      }
    }

    const body = await res.json();

    if (!res.ok) {
      return { data: null, error: new Error(body.error || "Request failed") };
    }

    return { data: body as T, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

async function tryRefreshToken(): Promise<boolean> {
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${PHP_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return false;
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

// ============================================
// Auth API
// ============================================
export const phpAuth = {
  async signUp(email: string, password: string, meta: Record<string, any> = {}) {
    const { data, error } = await apiFetch<{
      access_token: string;
      refresh_token: string;
      user: { id: string; email: string; name: string };
    }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, ...meta }),
    });

    if (data) {
      setTokens(data.access_token, data.refresh_token);
    }

    return { data, error };
  },

  async signIn(email: string, password: string) {
    const { data, error } = await apiFetch<{
      access_token: string;
      refresh_token: string;
      user: { id: string; email: string; name: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data) {
      setTokens(data.access_token, data.refresh_token);
    }

    return { data, error };
  },

  async signOut() {
    await apiFetch("/auth/logout", { method: "POST" });
    clearTokens();
  },

  async getSession() {
    if (!accessToken) return { data: null, error: null };
    // Decode JWT payload to get user info
    try {
      const payload = JSON.parse(atob(accessToken.split(".")[1]));
      if (payload.exp < Date.now() / 1000) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) return { data: null, error: null };
        const newPayload = JSON.parse(atob(accessToken!.split(".")[1]));
        return { data: { user: { id: newPayload.sub, email: newPayload.email } }, error: null };
      }
      return { data: { user: { id: payload.sub, email: payload.email } }, error: null };
    } catch {
      return { data: null, error: null };
    }
  },
};

// ============================================
// Query Builder (Supabase-like interface)
// ============================================
type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "in";

interface QueryFilter {
  column: string;
  op: FilterOp;
  value: any;
}

class PhpQueryBuilder<T = any> {
  private endpoint: string;
  private filters: QueryFilter[] = [];
  private _select: string = "*";
  private _order: { column: string; ascending: boolean } | null = null;
  private _limit: number | null = null;
  private _single: boolean = false;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  select(columns: string = "*") {
    this._select = columns;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: "neq", value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, op: "gt", value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, op: "gte", value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, op: "lt", value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, op: "lte", value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this._order = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this._limit = count;
    return this;
  }

  single() {
    this._single = true;
    this._limit = 1;
    return this;
  }

  maybeSingle() {
    this._single = true;
    this._limit = 1;
    return this;
  }

  private buildQueryString(): string {
    const params = new URLSearchParams();
    if (this._select !== "*") params.set("select", this._select);
    this.filters.forEach((f) => params.set(`${f.op}[${f.column}]`, String(f.value)));
    if (this._order) params.set("order", `${this._order.column}.${this._order.ascending ? "asc" : "desc"}`);
    if (this._limit) params.set("limit", String(this._limit));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }

  async then(resolve: (result: { data: T | T[] | null; error: Error | null }) => void) {
    const qs = this.buildQueryString();
    const { data, error } = await apiFetch<T[]>(`/${this.endpoint}${qs}`);

    if (error) {
      resolve({ data: null, error });
      return;
    }

    if (this._single && Array.isArray(data)) {
      resolve({ data: (data[0] as T) || null, error: null });
      return;
    }

    resolve({ data: data as T[], error: null });
  }
}

class PhpInsertBuilder<T = any> {
  private endpoint: string;
  private payload: any;
  private _selectAfter: boolean = false;
  private _single: boolean = false;

  constructor(endpoint: string, payload: any) {
    this.endpoint = endpoint;
    this.payload = payload;
  }

  select() {
    this._selectAfter = true;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  async then(resolve: (result: { data: T | null; error: Error | null }) => void) {
    const { data, error } = await apiFetch<{ id: string }>(`/${this.endpoint}`, {
      method: "POST",
      body: JSON.stringify(this.payload),
    });

    if (error) {
      resolve({ data: null, error });
      return;
    }

    if (this._selectAfter && data?.id) {
      const { data: fetched, error: fetchErr } = await apiFetch<T>(`/${this.endpoint}/${data.id}`);
      resolve({ data: fetched, error: fetchErr });
      return;
    }

    resolve({ data: data as unknown as T, error: null });
  }
}

class PhpUpdateBuilder<T = any> {
  private endpoint: string;
  private updates: any;
  private _id: string | null = null;

  constructor(endpoint: string, updates: any) {
    this.endpoint = endpoint;
    this.updates = updates;
  }

  eq(column: string, value: string) {
    if (column === "id") this._id = value;
    return this;
  }

  select() { return this; }
  single() { return this; }

  async then(resolve: (result: { data: T | null; error: Error | null }) => void) {
    if (!this._id) {
      resolve({ data: null, error: new Error("ID required for update") });
      return;
    }

    const { data, error } = await apiFetch<T>(`/${this.endpoint}/${this._id}`, {
      method: "PUT",
      body: JSON.stringify(this.updates),
    });

    resolve({ data, error });
  }
}

class PhpDeleteBuilder {
  private endpoint: string;
  private _id: string | null = null;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  eq(column: string, value: string) {
    if (column === "id") this._id = value;
    return this;
  }

  async then(resolve: (result: { data: null; error: Error | null }) => void) {
    if (!this._id) {
      resolve({ data: null, error: new Error("ID required for delete") });
      return;
    }

    const { error } = await apiFetch(`/${this.endpoint}/${this._id}`, {
      method: "DELETE",
    });

    resolve({ data: null, error });
  }
}

// ============================================
// Table Map (Supabase table name → PHP route)
// ============================================
const TABLE_ROUTE_MAP: Record<string, string> = {
  professionals: "profile",
  services: "services",
  clients: "clients",
  bookings: "bookings",
  working_hours: "working-hours",
  blocked_times: "blocked-times",
  products: "products",
  coupons: "coupons",
  payments: "payments",
  reviews: "reviews",
  expenses: "expenses",
  commissions: "commissions",
  campaigns: "campaigns",
  campaign_contacts: "campaign-contacts",
  salon_employees: "salon-employees",
  employee_services: "employee-services",
  employee_working_hours: "employee-working-hours",
  subscriptions: "subscriptions",
  whatsapp_instances: "whatsapp-instances",
  whatsapp_automations: "whatsapp-automations",
  whatsapp_logs: "whatsapp-logs",
  whatsapp_conversations: "conversations",
  daily_message_usage: "message-usage",
  cash_registers: "cash-registers",
  cash_transactions: "cash-transactions",
  chat_messages: "chat-messages",
  payment_config: "payment-config",
  courses: "courses",
  course_categories: "course-categories",
  course_classes: "course-classes",
  course_enrollments: "course-enrollments",
  course_attendance: "course-attendance",
  course_certificates: "course-certificates",
  course_materials: "course-materials",
  course_waitlist: "course-waitlist",
  instagram_accounts: "instagram-accounts",
  instagram_messages: "instagram-messages",
  instagram_keywords: "instagram-keywords",
  loyalty_config: "loyalty-config",
  loyalty_levels: "loyalty-levels",
  loyalty_challenges: "loyalty-challenges",
  cashback_rules: "cashback-rules",
  cashback_transactions: "cashback-transactions",
  client_cashback: "client-cashback",
  client_loyalty: "client-loyalty",
  client_referrals: "client-referrals",
  challenge_progress: "challenge-progress",
  service_packages: "service-packages",
  client_packages: "client-packages",
  waitlist_entries: "waitlist-entries",
  waitlist_settings: "waitlist-settings",
  waitlist_offers: "waitlist-offers",
  waitlist: "waitlist",
  upsell_rules: "upsell-rules",
  upsell_events: "upsell-events",
  feature_flags: "feature-flags",
  professional_limits: "professional-limits",
  addon_purchases: "addon-purchases",
  admin_auth_codes: "admin-auth-codes",
  platform_reviews: "platform-reviews",
  user_roles: "user-roles",
  professional_feature_overrides: "professional-feature-overrides",
  plan_limits: "plan-limits",
  google_calendar_tokens: "google-calendar-tokens",
};

function getRoute(table: string): string {
  return TABLE_ROUTE_MAP[table] || table.replace(/_/g, "-");
}

// ============================================
// Supabase-compatible interface
// ============================================
export const phpClient = {
  from<T = any>(table: string) {
    const route = getRoute(table);
    return {
      select(columns?: string) {
        const qb = new PhpQueryBuilder<T>(route);
        return qb.select(columns);
      },
      insert(payload: any) {
        return new PhpInsertBuilder<T>(route, payload);
      },
      update(updates: any) {
        return new PhpUpdateBuilder<T>(route, updates);
      },
      delete() {
        return new PhpDeleteBuilder(route);
      },
    };
  },

  // Edge function equivalent
  functions: {
    async invoke<T = any>(name: string, options?: { body?: any }) {
      return apiFetch<T>(`/${name}`, {
        method: "POST",
        body: options?.body ? JSON.stringify(options.body) : undefined,
      });
    },
  },

  // RPC equivalent
  async rpc<T = any>(fn: string, params?: Record<string, any>) {
    return apiFetch<T>(`/rpc/${fn}`, {
      method: "POST",
      body: params ? JSON.stringify(params) : undefined,
    });
  },

  // Auth namespace — internal listener registry
  _authListeners: [] as Array<(event: string, session: any) => void>,

  _notifyAuthListeners(event: string) {
    phpAuth.getSession().then(({ data }) => {
      phpClient._authListeners.forEach(cb => cb(event, data));
    });
  },

  auth: {
    signUp: async ({ email, password, options }: { email: string; password: string; options?: { data?: any; emailRedirectTo?: string } }) => {
      const result = await phpAuth.signUp(email, password, options?.data || {});
      if (!result.error && result.data) {
        phpClient._notifyAuthListeners("SIGNED_IN");
      }
      return result;
    },
    
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const result = await phpAuth.signIn(email, password);
      if (!result.error && result.data) {
        phpClient._notifyAuthListeners("SIGNED_IN");
      }
      return result;
    },
    
    signOut: async () => {
      await phpAuth.signOut();
      phpClient._notifyAuthListeners("SIGNED_OUT");
    },
    
    getSession: phpAuth.getSession,

    getUser: async () => {
      const session = await phpAuth.getSession();
      return { data: session.data ? { user: session.data.user } : { user: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Register listener
      phpClient._authListeners.push(callback);

      // Check on load
      phpAuth.getSession().then(({ data }) => {
        callback(data ? "SIGNED_IN" : "SIGNED_OUT", data);
      });

      // Listen for storage changes (cross-tab sync)
      const handler = (e: StorageEvent) => {
        if (e.key === "php_access_token") {
          phpAuth.getSession().then(({ data }) => {
            callback(data ? "SIGNED_IN" : "SIGNED_OUT", data);
          });
        }
      };
      window.addEventListener("storage", handler);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener("storage", handler);
              phpClient._authListeners = phpClient._authListeners.filter(cb2 => cb2 !== callback);
            },
          },
        },
      };
    },
  },

  // Realtime channel - delegates to phpRealtime (lazy to avoid circular dep)
  channel(name: string) {
    // Return a proxy object that lazily loads phpRealtime
    const listeners: Array<{ type: string; options: any; callback: any }> = [];
    const channelProxy = {
      on(type: string, options: any, callback: any) {
        listeners.push({ type, options, callback });
        return channelProxy;
      },
      subscribe() {
        getPhpRealtime().then((rt) => {
          let ch = rt.channel(name);
          listeners.forEach(({ type, options, callback }) => {
            ch = ch.on(type as any, options, callback);
          });
          ch.subscribe();
        });
        return { unsubscribe: () => {} };
      },
      unsubscribe() {},
    };
    return channelProxy;
  },

  // Remove channel (compat with Supabase)
  removeChannel(channel: any) {
    channel?.unsubscribe?.();
  },
};
