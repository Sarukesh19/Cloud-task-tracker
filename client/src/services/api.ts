import { Task, User, Notification, QueueJob, EmailOutboxItem, SystemStats, TaskStatus, TaskPriority } from '../types';

const API_BASE = '/api';

function getHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/auth/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async login(userId: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to login');
    }
    return res.json();
  },

  async switchUser(userId: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/switch-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to switch user');
    }
    return res.json();
  },

  async createUser(data: { name: string; email: string; role: 'ADMIN' | 'MEMBER'; title?: string; avatar?: string }): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create member');
    return result;
  },

  // Tasks
  async getTasks(filters?: {
    search?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    isOverdue?: boolean;
  }): Promise<Task[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.assigneeId) params.append('assigneeId', filters.assigneeId);
    if (filters?.isOverdue !== undefined) params.append('isOverdue', String(filters.isOverdue));

    const res = await fetch(`${API_BASE}/tasks?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch tasks');
    return res.json();
  },

  async getTask(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`);
    if (!res.ok) throw new Error('Failed to fetch task');
    return res.json();
  },

  async createTask(
    data: { title: string; description: string; dueDate: string; priority: TaskPriority; assigneeId: string },
    token: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create task');
    return result;
  },

  async updateTaskStatus(id: string, status: TaskStatus, token: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({ status })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update status');
    return result;
  },

  async updateTask(
    id: string,
    data: Partial<Task>,
    token: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: getHeaders(token),
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update task');
    return result;
  },

  async deleteTask(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
      headers: getHeaders(token)
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete task');
    }
  },

  async getTaskAudit(id: string): Promise<any[]> {
    const res = await fetch(`${API_BASE}/tasks/${id}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return res.json();
  },

  // Notifications
  async getNotifications(token: string): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications`, {
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to mark read');
  },

  async markAllNotificationsRead(token: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: getHeaders(token)
    });
    if (!res.ok) throw new Error('Failed to mark all read');
  },

  // System & Stretch Goals
  async getSystemStats(): Promise<{ stats: SystemStats; connectedClients: number; simulateQueueFailures: boolean }> {
    const res = await fetch(`${API_BASE}/system/stats`);
    if (!res.ok) throw new Error('Failed to fetch system stats');
    return res.json();
  },

  async getQueueStatus(): Promise<{
    jobs: QueueJob[];
    simulateFailures: boolean;
    summary: { queued: number; processing: number; retrying: number; completed: number; failed: number };
  }> {
    const res = await fetch(`${API_BASE}/system/queue`);
    if (!res.ok) throw new Error('Failed to fetch queue');
    return res.json();
  },

  async retryFailedJobs(): Promise<{ retriedCount: number; message: string }> {
    const res = await fetch(`${API_BASE}/system/queue/retry-failed`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to retry jobs');
    return res.json();
  },

  async toggleQueueFaults(): Promise<{ simulateFailures: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/system/queue/toggle-faults`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to toggle queue faults');
    return res.json();
  },

  async getEmailOutbox(): Promise<EmailOutboxItem[]> {
    const res = await fetch(`${API_BASE}/system/emails`);
    if (!res.ok) throw new Error('Failed to fetch email outbox');
    return res.json();
  },

  async resetDemoData(): Promise<void> {
    const res = await fetch(`${API_BASE}/system/reset-demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reset demo data');
  }
};
