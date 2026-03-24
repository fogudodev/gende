/**
 * PHP WebSocket Realtime Client
 * 
 * Connects to the Ratchet WebSocket server for realtime notifications.
 * Falls back to polling if WebSocket is unavailable.
 * 
 * Usage mirrors Supabase Realtime:
 *   const channel = phpRealtime.channel('bookings')
 *     .on('postgres_changes', { event: '*', table: 'bookings' }, callback)
 *     .subscribe();
 */

import { getAccessToken } from "./php-client";

const WS_URL = import.meta.env.VITE_WS_URL || "wss://api.gende.io/ws";
const RECONNECT_DELAY = 3000;
const PING_INTERVAL = 30000;
const MAX_RECONNECT_ATTEMPTS = 3;

type EventType = "INSERT" | "UPDATE" | "DELETE" | "*";

interface ChangePayload {
  table: string;
  type: string;
  record: Record<string, any>;
}

type ChangeCallback = (payload: ChangePayload) => void;

interface Subscription {
  table: string;
  event: EventType;
  callback: ChangeCallback;
}

// ============================================
// WebSocket Connection Manager (singleton)
// ============================================
class WebSocketManager {
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private connected = false;
  private authenticated = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pendingSubscribes: string[] = [];

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log("🔌 WebSocket connected");
        this.connected = true;
        this.authenticate();
        this.startPing();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onclose = () => {
        console.log("🔌 WebSocket disconnected");
        this.connected = false;
        this.authenticated = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("❌ WebSocket error:", err);
      };
    } catch (err) {
      console.error("❌ WebSocket connection failed:", err);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.reconnectTimer && clearTimeout(this.reconnectTimer);
    this.stopPing();
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
  }

  private authenticate(): void {
    const token = getAccessToken();
    if (!token) {
      console.warn("⚠️ No access token for WS auth");
      return;
    }
    this.send({ type: "auth", token });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case "auth_success":
        this.authenticated = true;
        console.log("🔐 WebSocket authenticated");
        // Subscribe to pending channels
        this.pendingSubscribes.forEach((ch) => this.send({ type: "subscribe", channel: ch }));
        this.pendingSubscribes = [];
        break;

      case "auth_error":
        console.error("🔐 WS auth failed:", data.message);
        break;

      case "subscribed":
        console.log(`📺 Subscribed to: ${data.channel}`);
        break;

      case "postgres_changes":
      case "broadcast":
        this.dispatchChange(data.channel, data.payload || data);
        break;

      case "pong":
        break;

      default:
        console.log("📨 WS message:", data);
    }
  }

  private dispatchChange(channel: string, payload: ChangePayload): void {
    const subs = this.subscriptions.get(channel) || [];
    subs.forEach((sub) => {
      if (sub.event === "*" || sub.event === payload.type) {
        sub.callback(payload);
      }
    });
  }

  subscribe(channel: string, event: EventType, callback: ChangeCallback): void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, []);
    }
    this.subscriptions.get(channel)!.push({ table: channel, event, callback });

    if (this.authenticated) {
      this.send({ type: "subscribe", channel });
    } else {
      this.pendingSubscribes.push(channel);
      if (!this.connected) this.connect();
    }
  }

  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    if (this.connected) {
      this.send({ type: "unsubscribe", channel });
    }
  }

  private send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.subscriptions.size > 0) {
        console.log("🔄 Reconnecting WebSocket...");
        this.connect();
      }
    }, RECONNECT_DELAY);
  }

  private startPing(): void {
    this.pingTimer = setInterval(() => {
      this.send({ type: "ping" });
    }, PING_INTERVAL);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  get isConnected(): boolean {
    return this.connected && this.authenticated;
  }
}

// Singleton
const wsManager = new WebSocketManager();

// ============================================
// Channel Builder (Supabase-like interface)
// ============================================
class PhpRealtimeChannel {
  private channelName: string;
  private listeners: Array<{ event: EventType; callback: ChangeCallback }> = [];

  constructor(name: string) {
    this.channelName = name;
  }

  on(
    _type: "postgres_changes",
    options: { event: EventType | string; schema?: string; table?: string },
    callback: ChangeCallback
  ): PhpRealtimeChannel {
    const event = (options.event || "*") as EventType;
    const table = options.table || this.channelName;
    this.channelName = table;
    this.listeners.push({ event, callback });
    return this;
  }

  subscribe(): { unsubscribe: () => void } {
    this.listeners.forEach(({ event, callback }) => {
      wsManager.subscribe(this.channelName, event, callback);
    });

    return {
      unsubscribe: () => {
        wsManager.unsubscribe(this.channelName);
      },
    };
  }
}

// ============================================
// Public API
// ============================================
export const phpRealtime = {
  channel(name: string): PhpRealtimeChannel {
    return new PhpRealtimeChannel(name);
  },

  connect(): void {
    wsManager.connect();
  },

  disconnect(): void {
    wsManager.disconnect();
  },

  get isConnected(): boolean {
    return wsManager.isConnected;
  },
};
