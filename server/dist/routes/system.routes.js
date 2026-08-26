"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const queue_service_1 = require("../services/queue.service");
const websocket_service_1 = require("../services/websocket.service");
const audit_service_1 = require("../services/audit.service");
const router = (0, express_1.Router)();
// GET System Statistics
router.get('/stats', (req, res) => {
    const tasks = db_1.db.getTasks();
    const queueJobs = db_1.db.getQueueJobs(100);
    const emails = db_1.db.getEmailOutbox(100);
    const stats = {
        totalTasks: tasks.length,
        pendingTasks: tasks.filter(t => t.status === 'PENDING').length,
        inProgressTasks: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
        overdueTasks: tasks.filter(t => t.isOverdue && t.status !== 'COMPLETED').length,
        totalNotificationsSent: queueJobs.filter(j => j.status === 'COMPLETED').length,
        activeQueueJobs: queueJobs.filter(j => j.status === 'QUEUED' || j.status === 'PROCESSING' || j.status === 'RETRYING').length,
        failedQueueJobs: queueJobs.filter(j => j.status === 'FAILED').length,
        processedQueueJobs: queueJobs.filter(j => j.status === 'COMPLETED').length,
        totalEmailsSent: emails.length
    };
    res.json({
        stats,
        connectedClients: websocket_service_1.wsService.getConnectedClientsCount(),
        simulateQueueFailures: db_1.db.getSimulateQueueFailures()
    });
});
// GET Queue Jobs (Stretch Goal 1)
router.get('/queue', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const jobs = db_1.db.getQueueJobs(limit);
    const simulateFailures = db_1.db.getSimulateQueueFailures();
    res.json({
        jobs,
        simulateFailures,
        summary: {
            queued: jobs.filter(j => j.status === 'QUEUED').length,
            processing: jobs.filter(j => j.status === 'PROCESSING').length,
            retrying: jobs.filter(j => j.status === 'RETRYING').length,
            completed: jobs.filter(j => j.status === 'COMPLETED').length,
            failed: jobs.filter(j => j.status === 'FAILED').length,
        }
    });
});
// POST Retry Failed DLQ Jobs (Stretch Goal 2)
router.post('/queue/retry-failed', (req, res) => {
    const retriedCount = queue_service_1.queueService.retryFailedJobs();
    res.json({ success: true, retriedCount, message: `Retried ${retriedCount} failed jobs.` });
});
// POST Toggle Queue Fault Simulation (For Live Testing of Retries & DLQ)
router.post('/queue/toggle-faults', (req, res) => {
    const current = db_1.db.getSimulateQueueFailures();
    const nextState = !current;
    db_1.db.setSimulateQueueFailures(nextState);
    res.json({
        success: true,
        simulateFailures: nextState,
        message: nextState
            ? 'Network fault simulation ENABLED. Queue jobs will experience intermittent failures to test exponential backoff and DLQ.'
            : 'Network fault simulation DISABLED. Queue jobs will process normally.'
    });
});
// GET Email Outbox (Stretch Goal 3)
router.get('/emails', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    const emails = db_1.db.getEmailOutbox(limit);
    res.json(emails);
});
// GET Global Audit Logs
router.get('/audit-logs', (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const logs = audit_service_1.auditService.getAllLogs(limit);
    res.json(logs);
});
// POST Reset Demo Data
router.post('/reset-demo', (req, res) => {
    const fresh = db_1.db.resetToSeed();
    websocket_service_1.wsService.broadcast('TASK_UPDATED', { action: 'SYSTEM_RESET' });
    res.json({ success: true, message: 'Database reset to initial demo seed.' });
});
exports.default = router;
