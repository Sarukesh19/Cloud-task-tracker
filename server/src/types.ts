export type Role = 'ADMIN' | 'MEMBER';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
  title: string;
  createdAt: string;
}

export interface TaskAuditLog {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: 'CREATED' | 'STATUS_CHANGE' | 'REASSIGNED' | 'UPDATED' | 'OVERDUE_FLAGGED' | 'DELETED';
  fieldChanged?: string;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: string;
  details?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  creatorId: string;
  creatorName: string;
  dueDate: string; // ISO string
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
  auditHistory?: TaskAuditLog[];
}

export interface Notification {
  id: string;
  userId: string; // Target user
  taskId?: string;
  taskTitle?: string;
  type: 'ASSIGNMENT' | 'STATUS_CHANGE' | 'OVERDUE' | 'SYSTEM';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface EmailOutboxItem {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  htmlBody: string;
  status: 'DELIVERED' | 'BOUNCED' | 'QUEUED';
  sentAt: string;
  taskId?: string;
}

export interface QueueJob {
  id: string;
  type: 'DISPATCH_NOTIFICATION' | 'DISPATCH_EMAIL' | 'AUDIT_AGGREGATION';
  payload: any;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'RETRYING' | 'FAILED';
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  processedAt?: string;
  errorLogs: string[];
  nextRunAt?: string;
}

export interface SystemStats {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalNotificationsSent: number;
  activeQueueJobs: number;
  failedQueueJobs: number;
  processedQueueJobs: number;
  totalEmailsSent: number;
}
