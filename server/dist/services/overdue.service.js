"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overdueService = void 0;
const db_1 = require("../db");
const config_1 = require("../config");
const audit_service_1 = require("./audit.service");
const queue_service_1 = require("./queue.service");
const websocket_service_1 = require("./websocket.service");
class OverdueService {
    timer = null;
    initialize() {
        if (process.env.NODE_ENV === 'test')
            return;
        if (this.timer)
            clearInterval(this.timer);
        // Run immediate check then recurring
        this.checkOverdueTasks();
        this.timer = setInterval(() => {
            this.checkOverdueTasks();
        }, config_1.CONFIG.OVERDUE_CHECK_INTERVAL_MS);
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    checkOverdueTasks() {
        const nowIso = new Date().toISOString();
        const tasks = db_1.db.getTasks();
        for (const task of tasks) {
            const isOpen = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
            const isPastDue = task.dueDate < nowIso;
            if (isOpen && isPastDue && !task.isOverdue) {
                // Flag as overdue!
                const updated = db_1.db.updateTask(task.id, { isOverdue: true });
                if (updated) {
                    // Log audit
                    audit_service_1.auditService.logTaskAction({
                        taskId: task.id,
                        user: {
                            id: 'system',
                            name: 'System Auto-Monitor',
                            role: 'ADMIN',
                            email: 'system@clubtech.edu',
                            avatar: '',
                            title: 'System Bot',
                            createdAt: ''
                        },
                        action: 'OVERDUE_FLAGGED',
                        fieldChanged: 'isOverdue',
                        oldValue: 'false',
                        newValue: 'true',
                        details: `Task automatically flagged overdue (due date ${new Date(task.dueDate).toLocaleString()} passed)`
                    });
                    // Enqueue notification for the assignee
                    queue_service_1.queueService.enqueueNotification({
                        userId: task.assigneeId,
                        task: updated,
                        type: 'OVERDUE',
                        actor: {
                            id: 'system',
                            name: 'System Monitor',
                            role: 'ADMIN',
                            email: 'system@clubtech.edu',
                            avatar: '',
                            title: 'Auto-Bot',
                            createdAt: ''
                        }
                    });
                    // Broadcast real-time update
                    websocket_service_1.wsService.broadcast('TASK_OVERDUE', {
                        taskId: task.id,
                        task: updated
                    });
                }
            }
            else if (!isOpen && task.isOverdue) {
                // Completed task should clear overdue flag
                db_1.db.updateTask(task.id, { isOverdue: false });
            }
        }
    }
}
exports.overdueService = new OverdueService();
