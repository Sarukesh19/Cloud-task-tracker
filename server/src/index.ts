import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { CONFIG } from './config';
import { wsService } from './services/websocket.service';
import { queueService } from './services/queue.service';
import { overdueService } from './services/overdue.service';

// Routes
import authRoutes from './routes/auth.routes';
import taskRoutes from './routes/task.routes';
import notificationRoutes from './routes/notification.routes';
import systemRoutes from './routes/system.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/system', systemRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Collaborative Task Tracker API & Realtime Hub',
    timestamp: new Date().toISOString(),
    connectedClients: wsService.getConnectedClientsCount()
  });
});

// Initialize Services
wsService.initialize(server);
queueService.initialize();
overdueService.initialize();

export { app, server };

if (process.env.NODE_ENV !== 'test') {
  server.listen(CONFIG.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Task Tracker Backend & Realtime Server Running!`);
    console.log(`📡 HTTP API:     http://localhost:${CONFIG.PORT}`);
    console.log(`⚡ WebSocket:    ws://localhost:${CONFIG.PORT}/ws`);
    console.log(`⏰ Overdue Poll: Every ${CONFIG.OVERDUE_CHECK_INTERVAL_MS / 1000}s`);
    console.log(`📬 Queue Worker: Active (Interval: ${CONFIG.NOTIFICATION_QUEUE_INTERVAL_MS}ms)`);
    console.log(`=======================================================`);
  });
}
