import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

export type RealTimeEvent = 
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_STATUS_CHANGED'
  | 'TASK_DELETED'
  | 'TASK_OVERDUE'
  | 'NOTIFICATION_RECEIVED'
  | 'QUEUE_UPDATED'
  | 'EMAIL_SENT'
  | 'STATS_UPDATED'
  | 'PING';

export interface WebSocketMessage {
  type: RealTimeEvent;
  payload: any;
  timestamp: string;
}

interface ClientMeta {
  ws: WebSocket;
  userId?: string;
  isAlive: boolean;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<ClientMeta> = new Set();

  private heartbeatInterval: NodeJS.Timeout | null = null;

  public initialize(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      // Parse optional userId from URL query e.g. /ws?userId=user-1
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const userId = url.searchParams.get('userId') || undefined;

      const clientMeta: ClientMeta = { ws, userId, isAlive: true };
      this.clients.add(clientMeta);

      // Send initial welcome message
      ws.send(JSON.stringify({
        type: 'SYSTEM_CONNECTED',
        payload: { message: 'Connected to Task Tracker Real-Time Hub 🚀', userId },
        timestamp: new Date().toISOString()
      }));

      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.type === 'SET_USER' && parsed.userId) {
            clientMeta.userId = parsed.userId;
          }
          if (parsed.type === 'PONG') {
            clientMeta.isAlive = true;
          }
        } catch (e) {
          // ignore malformed client messages
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientMeta);
      });

      ws.on('error', () => {
        this.clients.delete(clientMeta);
      });
    });

    if (process.env.NODE_ENV !== 'test') {
      // Heartbeat check every 30s to clean stale sockets
      this.heartbeatInterval = setInterval(() => {
        this.clients.forEach(client => {
          if (!client.isAlive) {
            client.ws.terminate();
            this.clients.delete(client);
            return;
          }
          client.isAlive = false;
          if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.ping();
          }
        });
      }, 30000);
    }
  }

  public stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }

  public broadcast(type: RealTimeEvent, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    const serialized = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    });
  }

  public sendToUser(userId: string, type: RealTimeEvent, payload: any): void {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };
    const serialized = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(serialized);
      }
    });
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const wsService = new WebSocketService();
