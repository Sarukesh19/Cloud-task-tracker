"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsService = void 0;
const ws_1 = require("ws");
class WebSocketService {
    wss = null;
    clients = new Set();
    heartbeatInterval = null;
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            // Parse optional userId from URL query e.g. /ws?userId=user-1
            const url = new URL(req.url || '', `http://${req.headers.host}`);
            const userId = url.searchParams.get('userId') || undefined;
            const clientMeta = { ws, userId, isAlive: true };
            this.clients.add(clientMeta);
            // Send initial welcome message
            ws.send(JSON.stringify({
                type: 'SYSTEM_CONNECTED',
                payload: { message: 'Connected to Task Tracker Real-Time Hub 🚀', userId },
                timestamp: new Date().toISOString()
            }));
            ws.on('message', (data) => {
                try {
                    const parsed = JSON.parse(data.toString());
                    if (parsed.type === 'SET_USER' && parsed.userId) {
                        clientMeta.userId = parsed.userId;
                    }
                    if (parsed.type === 'PONG') {
                        clientMeta.isAlive = true;
                    }
                }
                catch (e) {
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
                    if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                        client.ws.ping();
                    }
                });
            }, 30000);
        }
    }
    stop() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        if (this.wss) {
            this.wss.close();
            this.wss = null;
        }
    }
    broadcast(type, payload) {
        const message = {
            type,
            payload,
            timestamp: new Date().toISOString()
        };
        const serialized = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(serialized);
            }
        });
    }
    sendToUser(userId, type, payload) {
        const message = {
            type,
            payload,
            timestamp: new Date().toISOString()
        };
        const serialized = JSON.stringify(message);
        this.clients.forEach(client => {
            if (client.userId === userId && client.ws.readyState === ws_1.WebSocket.OPEN) {
                client.ws.send(serialized);
            }
        });
    }
    getConnectedClientsCount() {
        return this.clients.size;
    }
}
exports.wsService = new WebSocketService();
