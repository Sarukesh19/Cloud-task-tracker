"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const config_1 = require("./config");
const websocket_service_1 = require("./services/websocket.service");
const queue_service_1 = require("./services/queue.service");
const overdue_service_1 = require("./services/overdue.service");
// Routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
const system_routes_1 = __importDefault(require("./routes/system.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Middleware
app.use((0, cors_1.default)({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express_1.default.json());
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/tasks', task_routes_1.default);
app.use('/api/notifications', notification_routes_1.default);
app.use('/api/system', system_routes_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'HEALTHY',
        service: 'Collaborative Task Tracker API & Realtime Hub',
        timestamp: new Date().toISOString(),
        connectedClients: websocket_service_1.wsService.getConnectedClientsCount()
    });
});
// Initialize Services
websocket_service_1.wsService.initialize(server);
queue_service_1.queueService.initialize();
overdue_service_1.overdueService.initialize();
if (process.env.NODE_ENV !== 'test') {
    server.listen(config_1.CONFIG.PORT, () => {
        console.log(`=======================================================`);
        console.log(`🚀 Task Tracker Backend & Realtime Server Running!`);
        console.log(`📡 HTTP API:     http://localhost:${config_1.CONFIG.PORT}`);
        console.log(`⚡ WebSocket:    ws://localhost:${config_1.CONFIG.PORT}/ws`);
        console.log(`⏰ Overdue Poll: Every ${config_1.CONFIG.OVERDUE_CHECK_INTERVAL_MS / 1000}s`);
        console.log(`📬 Queue Worker: Active (Interval: ${config_1.CONFIG.NOTIFICATION_QUEUE_INTERVAL_MS}ms)`);
        console.log(`=======================================================`);
    });
}
