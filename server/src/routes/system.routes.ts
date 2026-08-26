import { Router, Request, Response } from 'express';
import { db } from '../db';
import { queueService } from '../services/queue.service';
import { wsService } from '../services/websocket.service';
import { auditService } from '../services/audit.service';
import { SystemStats } from '../types';

const router = Router();

// GET System Statistics
router.get('/stats', (req: Request, res: Response) => {
  const tasks = db.getTasks();
  const queueJobs = db.getQueueJobs(100);
  const emails = db.getEmailOutbox(100);

  const stats: SystemStats = {
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
    connectedClients: wsService.getConnectedClientsCount(),
    simulateQueueFailures: db.getSimulateQueueFailures()
  });
});

// GET Queue Jobs (Stretch Goal 1)
router.get('/queue', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const jobs = db.getQueueJobs(limit);
  const simulateFailures = db.getSimulateQueueFailures();

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
router.post('/queue/retry-failed', (req: Request, res: Response) => {
  const retriedCount = queueService.retryFailedJobs();
  res.json({ success: true, retriedCount, message: `Retried ${retriedCount} failed jobs.` });
});

// POST Toggle Queue Fault Simulation (For Live Testing of Retries & DLQ)
router.post('/queue/toggle-faults', (req: Request, res: Response) => {
  const current = db.getSimulateQueueFailures();
  const nextState = !current;
  db.setSimulateQueueFailures(nextState);
  res.json({
    success: true,
    simulateFailures: nextState,
    message: nextState
      ? 'Network fault simulation ENABLED. Queue jobs will experience intermittent failures to test exponential backoff and DLQ.'
      : 'Network fault simulation DISABLED. Queue jobs will process normally.'
  });
});

// GET Email Outbox (Stretch Goal 3)
router.get('/emails', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const emails = db.getEmailOutbox(limit);
  res.json(emails);
});

// GET Global Audit Logs
router.get('/audit-logs', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  const logs = auditService.getAllLogs(limit);
  res.json(logs);
});

// POST Reset Demo Data
router.post('/reset-demo', (req: Request, res: Response) => {
  const fresh = db.resetToSeed();
  wsService.broadcast('TASK_UPDATED', { action: 'SYSTEM_RESET' });
  res.json({ success: true, message: 'Database reset to initial demo seed.' });
});

export default router;
