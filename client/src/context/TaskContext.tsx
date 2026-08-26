import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Task, TaskStatus, TaskPriority } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

interface TaskContextType {
  tasks: Task[];
  filteredTasks: Task[];
  isLoading: boolean;
  selectedTask: Task | null;
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  showOverdueOnly: boolean;
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: string) => void;
  setPriorityFilter: (priority: string) => void;
  setAssigneeFilter: (assigneeId: string) => void;
  setShowOverdueOnly: (val: boolean) => void;
  setSelectedTask: (task: Task | null) => void;
  createTask: (data: { title: string; description: string; dueDate: string; priority: TaskPriority; assigneeId: string }) => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  refreshTasks: () => Promise<void>;
  openTaskDetail: (task: Task) => void;
  closeTaskDetail: () => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, refreshUsers } = useAuth();
  const { showToast } = useNotifications();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const activeDetailIdRef = useRef<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [showOverdueOnly, setShowOverdueOnly] = useState<boolean>(false);

  const refreshTasks = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data);
      setSelectedTask(prev => {
        if (!prev) return null;
        const found = data.find(t => t.id === prev.id);
        return found ? { ...prev, ...found } : prev;
      });
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTasks();
  }, [refreshTasks]);

  // Live WebSocket updates
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'TASK_CREATED') {
            setTasks(prev => [data.payload, ...prev.filter(t => t.id !== data.payload.id)]);
            refreshUsers();
          } else if (data.type === 'TASK_UPDATED' || data.type === 'TASK_STATUS_CHANGED') {
            const updatedTask: Task = data.payload.task || data.payload;
            setTasks(prev => prev.map(t => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
            setSelectedTask(prev => (prev?.id === updatedTask.id ? { ...prev, ...updatedTask } : prev));
            refreshUsers();
          } else if (data.type === 'TASK_OVERDUE') {
            const overdueTask: Task = data.payload.task;
            setTasks(prev => prev.map(t => (t.id === overdueTask.id ? { ...t, isOverdue: true } : t)));
            setSelectedTask(prev => (prev?.id === overdueTask.id ? { ...prev, isOverdue: true } : prev));
          } else if (data.type === 'TASK_DELETED') {
            setTasks(prev => prev.filter(t => t.id !== data.payload.taskId));
            setSelectedTask(prev => (prev?.id === data.payload.taskId ? null : prev));
            refreshUsers();
          }
        } catch (e) {
          // ignore
        }
      };
    } catch (e) {
      // ignore
    }

    return () => {
      if (ws) ws.close();
    };
  }, [refreshUsers]);

  // Create Task Action
  const createTask = async (data: { title: string; description: string; dueDate: string; priority: TaskPriority; assigneeId: string }) => {
    if (!token) throw new Error('Not authenticated');
    try {
      const created = await api.createTask(data, token);
      setTasks(prev => [created, ...prev]);
      showToast('Task Created 🚀', `"${created.title}" successfully assigned to ${created.assigneeName}`, 'success');
      await refreshUsers();
    } catch (err: any) {
      showToast('Assignment Rejected ❌', err.message, 'error');
      throw err;
    }
  };

  // Update Status Action (Enforces Constraints 1 & 2)
  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) throw new Error('Not authenticated');
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.status === 'PENDING' && newStatus === 'COMPLETED') {
      showToast(
        'Constraint 1 Violation 🚫',
        'Tasks cannot jump from Pending directly to Completed! They must pass through In Progress.',
        'warning'
      );
      throw new Error('Tasks cannot jump from Pending directly to Completed.');
    }

    if (newStatus === 'COMPLETED' && user && user.role !== 'ADMIN' && task.assigneeId !== user.id) {
      showToast(
        'Constraint 2 Violation 🔒',
        `Only the assignee (${task.assigneeName}) or an Admin can mark this task Completed.`,
        'warning'
      );
      throw new Error('Only the assignee or an Admin can mark this task Completed.');
    }

    try {
      const updated = await api.updateTaskStatus(taskId, newStatus, token);
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      setSelectedTask(prev => (prev?.id === taskId ? updated : prev));

      if (newStatus === 'COMPLETED') {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
        showToast('Mission Accomplished! 🎉', `"${task.title}" is marked Completed!`, 'success');
      } else {
        showToast('Status Updated ⚡', `"${task.title}" moved to ${newStatus}`, 'info');
      }

      await refreshUsers();
    } catch (err: any) {
      showToast('Status Update Failed ❌', err.message, 'error');
      throw err;
    }
  };

  // Update Task Action
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    if (!token) throw new Error('Not authenticated');
    try {
      const updated = await api.updateTask(taskId, updates, token);
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      setSelectedTask(prev => (prev?.id === taskId ? updated : prev));
      showToast('Task Updated 📝', `"${updated.title}" was updated.`, 'info');
      await refreshUsers();
    } catch (err: any) {
      showToast('Update Failed ❌', err.message, 'error');
      throw err;
    }
  };

  // Delete Task Action
  const deleteTask = async (taskId: string) => {
    if (!token) throw new Error('Not authenticated');
    try {
      await api.deleteTask(taskId, token);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(prev => (prev?.id === taskId ? null : prev));
      showToast('Task Deleted 🗑️', 'The task was removed.', 'info');
      await refreshUsers();
    } catch (err: any) {
      showToast('Delete Failed ❌', err.message, 'error');
      throw err;
    }
  };

  const openTaskDetail = async (task: Task) => {
    activeDetailIdRef.current = task.id;
    setSelectedTask(task);
    try {
      const fullTask = await api.getTask(task.id);
      // Only set if drawer was not closed or changed while fetching
      if (activeDetailIdRef.current === task.id) {
        setSelectedTask(fullTask);
      }
    } catch (e) {
      // ignore
    }
  };

  const closeTaskDetail = () => {
    activeDetailIdRef.current = null;
    setSelectedTask(null);
  };

  // Filtering Logic
  const filteredTasks = tasks.filter(t => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchAssignee = t.assigneeName.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchAssignee) return false;
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'OVERDUE') {
        if (!t.isOverdue || t.status === 'COMPLETED') return false;
      } else if (t.status !== statusFilter) {
        return false;
      }
    }

    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) {
      return false;
    }

    if (assigneeFilter !== 'ALL') {
      if (assigneeFilter === 'MY_TASKS') {
        if (user && t.assigneeId !== user.id) return false;
      } else if (t.assigneeId !== assigneeFilter) {
        return false;
      }
    }

    if (showOverdueOnly && (!t.isOverdue || t.status === 'COMPLETED')) {
      return false;
    }

    return true;
  });

  return (
    <TaskContext.Provider
      value={{
        tasks,
        filteredTasks,
        isLoading,
        selectedTask,
        searchQuery,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        showOverdueOnly,
        setSearchQuery,
        setStatusFilter,
        setPriorityFilter,
        setAssigneeFilter,
        setShowOverdueOnly,
        setSelectedTask,
        createTask,
        updateTaskStatus,
        updateTask,
        deleteTask,
        refreshTasks,
        openTaskDetail,
        closeTaskDetail
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};
