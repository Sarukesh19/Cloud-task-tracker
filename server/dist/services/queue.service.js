"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../db");
const config_1 = require("../config");
const websocket_service_1 = require("./websocket.service");
class NotificationQueueService {
    isProcessing = false;
    timer = null;
    initialize() {
        if (process.env.NODE_ENV === 'test')
            return;
        if (this.timer)
            clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.processNextJob();
        }, config_1.CONFIG.NOTIFICATION_QUEUE_INTERVAL_MS);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * Enqueues a notification job to be processed asynchronously by the worker
     */
    enqueueNotification(params) {
        let title = '';
        let message = '';
        let emailSubject = '';
        if (params.type === 'ASSIGNMENT') {
            title = 'Task Assigned to You 🎯';
            message = `${params.actor.name} assigned you the task: "${params.task.title}" (Priority: ${params.task.priority})`;
            emailSubject = `[Task Assigned] ${params.task.title}`;
        }
        else if (params.type === 'STATUS_CHANGE') {
            title = `Task Status: ${params.task.status} ⚡`;
            message = `${params.actor.name} updated "${params.task.title}" to ${params.task.status}`;
            emailSubject = `[Task Updated - ${params.task.status}] ${params.task.title}`;
        }
        else if (params.type === 'OVERDUE') {
            title = 'Task Overdue Warning 🚨';
            message = `"${params.task.title}" has passed its due date (${new Date(params.task.dueDate).toLocaleString()}) and is still pending!`;
            emailSubject = `[URGENT: Overdue] ${params.task.title}`;
        }
        const job = {
            id: `job-${(0, uuid_1.v4)().substring(0, 8)}`,
            type: 'DISPATCH_NOTIFICATION',
            payload: {
                userId: params.userId,
                taskId: params.task.id,
                taskTitle: params.task.title,
                type: params.type,
                title,
                message,
                emailSubject,
                taskPriority: params.task.priority,
                taskDueDate: params.task.dueDate,
                actorName: params.actor.name,
            },
            status: 'QUEUED',
            attempts: 0,
            maxAttempts: config_1.CONFIG.NOTIFICATION_MAX_RETRIES,
            createdAt: new Date().toISOString(),
            errorLogs: []
        };
        const savedJob = db_1.db.insertQueueJob(job);
        websocket_service_1.wsService.broadcast('QUEUE_UPDATED', { action: 'JOB_ENQUEUED', job: savedJob });
        return savedJob;
    }
    /**
     * Worker loop: pulls ready jobs and executes delivery logic
     */
    async processNextJob() {
        if (this.isProcessing)
            return;
        const pendingJobs = db_1.db.getPendingQueueJobs();
        if (pendingJobs.length === 0)
            return;
        this.isProcessing = true;
        const job = pendingJobs[0];
        try {
            db_1.db.updateQueueJob(job.id, {
                status: 'PROCESSING',
                attempts: job.attempts + 1
            });
            websocket_service_1.wsService.broadcast('QUEUE_UPDATED', { action: 'JOB_PROCESSING', jobId: job.id });
            // Simulated work delay (100ms - 300ms)
            await new Promise(res => setTimeout(res, 200));
            // Check if simulated failures are enabled (for testing retries & DLQ)
            const simulateFailure = db_1.db.getSimulateQueueFailures();
            if (simulateFailure && Math.random() < 0.7) {
                throw new Error(`Simulated Network/Worker Timeout Fault (Attempt ${job.attempts + 1}/${job.maxAttempts})`);
            }
            // 1. Create In-App Notification
            const notification = {
                id: `notif-${(0, uuid_1.v4)().substring(0, 8)}`,
                userId: job.payload.userId,
                taskId: job.payload.taskId,
                taskTitle: job.payload.taskTitle,
                type: job.payload.type,
                title: job.payload.title,
                message: job.payload.message,
                read: false,
                createdAt: new Date().toISOString()
            };
            db_1.db.insertNotification(notification);
            // Real-time instant dispatch ONLY to the target user (prevent duplicate echo)
            websocket_service_1.wsService.sendToUser(job.payload.userId, 'NOTIFICATION_RECEIVED', notification);
            // 2. Stretch Goal: Generate and Dispatch HTML Email
            const targetUser = db_1.db.getUserById(job.payload.userId);
            if (targetUser) {
                const htmlBody = this.generateHtmlEmail({
                    recipientName: targetUser.name,
                    title: job.payload.title,
                    message: job.payload.message,
                    taskTitle: job.payload.taskTitle,
                    priority: job.payload.taskPriority,
                    dueDate: job.payload.taskDueDate,
                    actorName: job.payload.actorName,
                    type: job.payload.type
                });
                const emailItem = {
                    id: `email-${(0, uuid_1.v4)().substring(0, 8)}`,
                    toEmail: targetUser.email,
                    toName: targetUser.name,
                    subject: job.payload.emailSubject,
                    htmlBody,
                    status: 'DELIVERED',
                    sentAt: new Date().toISOString(),
                    taskId: job.payload.taskId
                };
                db_1.db.insertEmailOutbox(emailItem);
                websocket_service_1.wsService.broadcast('EMAIL_SENT', emailItem);
            }
            // Mark job completed
            db_1.db.updateQueueJob(job.id, {
                status: 'COMPLETED',
                processedAt: new Date().toISOString()
            });
            websocket_service_1.wsService.broadcast('QUEUE_UPDATED', { action: 'JOB_COMPLETED', jobId: job.id });
        }
        catch (err) {
            const errorMsg = err?.message || 'Unknown processing error';
            const updatedLogs = [...(job.errorLogs || []), `[${new Date().toISOString()}] ${errorMsg}`];
            const newAttempts = job.attempts + 1;
            if (newAttempts < job.maxAttempts) {
                // Exponential backoff: 2s, 4s, etc.
                const backoffMs = Math.pow(2, newAttempts) * 1000;
                const nextRunAt = new Date(Date.now() + backoffMs).toISOString();
                db_1.db.updateQueueJob(job.id, {
                    status: 'RETRYING',
                    attempts: newAttempts,
                    nextRunAt,
                    errorLogs: updatedLogs
                });
                websocket_service_1.wsService.broadcast('QUEUE_UPDATED', {
                    action: 'JOB_RETRYING',
                    jobId: job.id,
                    attempts: newAttempts,
                    nextRunAt
                });
            }
            else {
                // Move to Dead-Letter Queue (FAILED)
                db_1.db.updateQueueJob(job.id, {
                    status: 'FAILED',
                    attempts: newAttempts,
                    errorLogs: updatedLogs
                });
                websocket_service_1.wsService.broadcast('QUEUE_UPDATED', { action: 'JOB_FAILED_DLQ', jobId: job.id });
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    retryFailedJobs() {
        const failedJobs = db_1.db.getQueueJobs(100).filter(j => j.status === 'FAILED');
        let count = 0;
        for (const job of failedJobs) {
            db_1.db.updateQueueJob(job.id, {
                status: 'QUEUED',
                attempts: 0,
                nextRunAt: undefined,
                errorLogs: [...job.errorLogs, `[${new Date().toISOString()}] Manual retry triggered by administrator`]
            });
            count++;
        }
        websocket_service_1.wsService.broadcast('QUEUE_UPDATED', { action: 'ALL_RETRIED', count });
        return count;
    }
    generateHtmlEmail(data) {
        const priorityColor = data.priority === 'URGENT' ? '#ef4444' :
            data.priority === 'HIGH' ? '#f97316' :
                data.priority === 'MEDIUM' ? '#3b82f6' : '#10b981';
        return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <span>⚡</span> Cloud Task Tracker Notification
          </h1>
          <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Real-Time Team Task Update</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Hi <strong>${data.recipientName}</strong>,</p>
          <div style="background: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a;">${data.title}</h3>
            <p style="margin: 0; font-size: 14px; color: #475569; line-height: 1.5;">${data.message}</p>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b; width: 120px;">Task Name:</td>
              <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${data.taskTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Priority:</td>
              <td style="padding: 8px 0;"><span style="background: ${priorityColor}15; color: ${priorityColor}; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid ${priorityColor}40;">${data.priority}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px 0; color: #64748b;">Due Date:</td>
              <td style="padding: 8px 0; color: #0f172a;">${new Date(data.dueDate).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Triggered By:</td>
              <td style="padding: 8px 0; color: #0f172a;">${data.actorName}</td>
            </tr>
          </table>

          <div style="margin-top: 24px; text-align: center;">
            <a href="#" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Open in Task Dashboard ➔</a>
          </div>
        </div>
        <div style="background: #f1f5f9; padding: 14px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
          This is an automated notification from Cloud Task Tracker System. Dispatched within 30 seconds of activity.
        </div>
      </div>
    `;
    }
}
exports.queueService = new NotificationQueueService();
