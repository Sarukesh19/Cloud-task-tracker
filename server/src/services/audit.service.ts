import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { TaskAuditLog, User, Task } from '../types';

class AuditService {
  public logTaskAction(params: {
    taskId: string;
    user: User;
    action: 'CREATED' | 'STATUS_CHANGE' | 'REASSIGNED' | 'UPDATED' | 'OVERDUE_FLAGGED' | 'DELETED';
    fieldChanged?: string;
    oldValue?: string | null;
    newValue?: string | null;
    details?: string;
  }): TaskAuditLog {
    const log: TaskAuditLog = {
      id: `audit-${uuidv4().substring(0, 8)}`,
      taskId: params.taskId,
      userId: params.user.id,
      userName: params.user.name,
      userRole: params.user.role,
      action: params.action,
      fieldChanged: params.fieldChanged,
      oldValue: params.oldValue,
      newValue: params.newValue,
      timestamp: new Date().toISOString(),
      details: params.details
    };

    return db.insertAuditLog(log);
  }

  public getHistoryForTask(taskId: string): TaskAuditLog[] {
    return db.getAuditLogsForTask(taskId);
  }

  public getAllLogs(limit = 100): TaskAuditLog[] {
    return db.getAllAuditLogs(limit);
  }
}

export const auditService = new AuditService();
