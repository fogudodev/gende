import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { validateToken } from './auth.js';
import { getProfessionalId } from './auth.js';

interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  professionalId: string | null;
  channels: Set<string>;
  isAlive: boolean;
}

const clients = new Map<WebSocket, AuthenticatedClient>();

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  console.log('🔌 WebSocket server attached at /ws');

  wss.on('connection', (ws: WebSocket) => {
    const client: AuthenticatedClient = {
      ws,
      userId: '',
      professionalId: null,
      channels: new Set(),
      isAlive: true,
    };

    const authTimeout = setTimeout(() => {
      if (!client.userId) {
        ws.close(4001, 'Authentication timeout');
      }
    }, 10000);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', async (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());

        switch (msg.type) {
          case 'auth': {
            const payload = validateToken(msg.token);
            if (!payload) {
              ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
              ws.close(4003, 'Invalid token');
              return;
            }
            client.userId = payload.sub;
            client.professionalId = await getProfessionalId(payload.sub);
            clients.set(ws, client);
            clearTimeout(authTimeout);
            ws.send(JSON.stringify({ type: 'auth_success' }));
            break;
          }

          case 'subscribe': {
            if (!client.userId) return;
            const channel = msg.channel as string;
            if (channel) {
              client.channels.add(channel);
              ws.send(JSON.stringify({ type: 'subscribed', channel }));
            }
            break;
          }

          case 'unsubscribe': {
            const channel = msg.channel as string;
            if (channel) client.channels.delete(channel);
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      clearTimeout(authTimeout);
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  // Heartbeat every 30s
  setInterval(() => {
    clients.forEach((client, ws) => {
      if (!client.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      client.isAlive = false;
      ws.ping();
    });
  }, 30000);
}

export function broadcastChange(
  channel: string,
  payload: { type: string; table: string; record: Record<string, any> },
  professionalId?: string
): void {
  const message = JSON.stringify({ type: 'postgres_changes', channel, payload });
  clients.forEach((client) => {
    if (!client.channels.has(channel)) return;
    if (professionalId && client.professionalId !== professionalId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}

export function broadcastToUser(userId: string, channel: string, payload: any): void {
  const message = JSON.stringify({ type: 'broadcast', channel, payload });
  clients.forEach((client) => {
    if (client.userId !== userId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(message);
    }
  });
}