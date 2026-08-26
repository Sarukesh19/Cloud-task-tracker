import { db } from '../db';
import { CONFIG } from '../config';
import { auditService } from './audit.service';
import { queueService } from './queue.service';
import { wsService } from './websocket.service';

class OverdueService {
  private timer: NodeJS.Timeout | null = null;

  public initialize(): void {
    if (process.env.NODE_ENV === 'test') return;
    if (this.timer) clearInterval(this.timer);
    
    // Run immediate check then recurring
    this.checkOverdueTasks();
    this.timer = setInterval(() => {
      this.checkOverdueTasks();
    }, CONFIG.OVERDUE_CHECK_INTERVAL_MS);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public checkOverdueTasks(): void {
    const nowIso = new Date().toISOString();
    const tasks = db.getTasks();

    for (const task of tasks) {
      const isOpen = task.status === 'PENDING' || task.status === 'IN_PROGRESS';
      const isPastDue = task.dueDate < nowIso;

      if (isOpen && isPastDue && !task.isOverdue) {
        // Flag as overdue!
        const updated = db.updateTask(task.id, { isOverdue: true });
        if (updated) {
          // Log audit
          auditService.logTaskAction({
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
          queueService.enqueueNotification({
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
          wsService.broadcast('TASK_OVERDUE', {
            taskId: task.id,
            task: updated
          });
        }
      } else if (!isOpen && task.isOverdue) {
        // Completed task should clear overdue flag
        db.updateTask(task.id, { isOverdue: false });
      }
    }
  }
}

export const overdueService = new OverdueService();
