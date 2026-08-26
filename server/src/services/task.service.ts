import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { Task, TaskStatus, TaskPriority, User } from '../types';
import { CONFIG } from '../config';
import { auditService } from './audit.service';
import { queueService } from './queue.service';
import { wsService } from './websocket.service';

export interface CreateTaskDTO {
  title: string;
  description: string;
  dueDate: string;
  priority: TaskPriority;
  assigneeId: string;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  status?: TaskStatus;
}

export class TaskServiceError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, TaskServiceError.prototype);
  }
}

class TaskService {
  /**
   * Get all tasks with full search & filtering support
   */
  public getTasks(filters: {
    search?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    isOverdue?: boolean;
  }): Task[] {
    let tasks = db.getTasks();

    if (filters.search) {
      const q = filters.search.toLowerCase();
      tasks = tasks.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assigneeName.toLowerCase().includes(q)
      );
    }

    if (filters.status) {
      if (filters.status === 'OVERDUE') {
        tasks = tasks.filter(t => t.isOverdue && t.status !== 'COMPLETED');
      } else {
        tasks = tasks.filter(t => t.status === filters.status);
      }
    }

    if (filters.priority) {
      tasks = tasks.filter(t => t.priority === filters.priority);
    }

    if (filters.assigneeId) {
      tasks = tasks.filter(t => t.assigneeId === filters.assigneeId);
    }

    if (filters.isOverdue !== undefined) {
      tasks = tasks.filter(t => t.isOverdue === filters.isOverdue);
    }

    // Attach recent audit logs to each task
    return tasks.map(t => ({
      ...t,
      auditHistory: auditService.getHistoryForTask(t.id).slice(0, 5)
    }));
  }

  public getTaskById(id: string): Task | null {
    const task = db.getTaskById(id);
    if (!task) return null;
    return {
      ...task,
      auditHistory: auditService.getHistoryForTask(id)
    };
  }

  /**
   * Create a new task with Constraint 3 check (max 5 active tasks)
   */
  public createTask(data: CreateTaskDTO, creator: User): Task {
    if (!data.title || !data.title.trim()) {
      throw new TaskServiceError('Task title is required.', 400);
    }

    const assignee = db.getUserById(data.assigneeId);
    if (!assignee) {
      throw new TaskServiceError(`Assignee user '${data.assigneeId}' does not exist.`, 400);
    }

    // CONSTRAINT 3: Max 5 active tasks per user
    const activeTasksCount = db.getActiveTaskCountForUser(data.assigneeId);
    if (activeTasksCount >= CONFIG.MAX_ACTIVE_TASKS_PER_USER) {
      throw new TaskServiceError(
        `Assignment rejected: Member '${assignee.name}' already has ${activeTasksCount} active tasks (Pending/In Progress). Maximum allowed active tasks per member is ${CONFIG.MAX_ACTIVE_TASKS_PER_USER}.`,
        400
      );
    }

    const now = new Date().toISOString();
    const isOverdue = data.dueDate ? data.dueDate < now : false;

    const newTask: Task = {
      id: `task-${uuidv4().substring(0, 8)}`,
      title: data.title.trim(),
      description: data.description || '',
      status: 'PENDING',
      priority: data.priority || 'MEDIUM',
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      creatorId: creator.id,
      creatorName: creator.name,
      dueDate: data.dueDate,
      isOverdue,
      createdAt: now,
      updatedAt: now
    };

    const savedTask = db.insertTask(newTask);

    // Audit log
    auditService.logTaskAction({
      taskId: savedTask.id,
      user: creator,
      action: 'CREATED',
      details: `Task created and assigned to ${assignee.name} (Priority: ${savedTask.priority})`
    });

    // Enqueue Assignment Notification
    queueService.enqueueNotification({
      userId: assignee.id,
      task: savedTask,
      type: 'ASSIGNMENT',
      actor: creator
    });

    // Real-time broadcast
    wsService.broadcast('TASK_CREATED', savedTask);

    return {
      ...savedTask,
      auditHistory: auditService.getHistoryForTask(savedTask.id)
    };
  }

  /**
   * Update task status with Constraints 1 & 2
   */
  public updateTaskStatus(taskId: string, newStatus: TaskStatus, actor: User): Task {
    const task = db.getTaskById(taskId);
    if (!task) {
      throw new TaskServiceError(`Task with ID '${taskId}' not found.`, 404);
    }

    const currentStatus = task.status;
    if (currentStatus === newStatus) {
      return task;
    }

    // CONSTRAINT 1: A task can't skip from Pending straight to Completed — it must pass through In Progress
    if (currentStatus === 'PENDING' && newStatus === 'COMPLETED') {
      throw new TaskServiceError(
        'Invalid state transition: A task cannot skip from Pending directly to Completed. It must pass through In Progress first.',
        400
      );
    }

    // CONSTRAINT 2: Only the assignee or an admin/lead may mark a task Completed, enforced server-side
    if (newStatus === 'COMPLETED') {
      const isAssignee = task.assigneeId === actor.id;
      const isAdmin = actor.role === 'ADMIN';

      if (!isAssignee && !isAdmin) {
        throw new TaskServiceError(
          `Permission denied: Only the task assignee (${task.assigneeName}) or an Admin/Lead can mark this task as Completed. Current user: ${actor.name} (${actor.role}).`,
          403
        );
      }
    }

    // Update status
    const isNowCompleted = newStatus === 'COMPLETED';
    const updated = db.updateTask(taskId, {
      status: newStatus,
      isOverdue: isNowCompleted ? false : task.isOverdue
    });

    if (!updated) {
      throw new TaskServiceError('Failed to update task status.', 500);
    }

    // Audit log
    auditService.logTaskAction({
      taskId: updated.id,
      user: actor,
      action: 'STATUS_CHANGE',
      fieldChanged: 'status',
      oldValue: currentStatus,
      newValue: newStatus,
      details: `${actor.name} moved task from ${currentStatus} to ${newStatus}`
    });

    // Enqueue notification to the assignee (if actor != assignee) or to creator (if actor == assignee)
    const targetUserId = actor.id === updated.assigneeId ? updated.creatorId : updated.assigneeId;
    if (targetUserId && targetUserId !== actor.id) {
      queueService.enqueueNotification({
        userId: targetUserId,
        task: updated,
        type: 'STATUS_CHANGE',
        actor,
        previousStatus: currentStatus
      });
    }

    // Broadcast live event
    wsService.broadcast('TASK_STATUS_CHANGED', {
      task: updated,
      oldStatus: currentStatus,
      newStatus: newStatus,
      updatedBy: actor.name
    });

    return {
      ...updated,
      auditHistory: auditService.getHistoryForTask(updated.id)
    };
  }

  /**
   * General task update (title, description, priority, dueDate, assignee)
   */
  public updateTask(taskId: string, updates: UpdateTaskDTO, actor: User): Task {
    const task = db.getTaskById(taskId);
    if (!task) {
      throw new TaskServiceError(`Task with ID '${taskId}' not found.`, 404);
    }

    // If status is being changed, delegate through status validator
    if (updates.status && updates.status !== task.status) {
      this.updateTaskStatus(taskId, updates.status, actor);
    }

    // If assignee is changing, check Constraint 3 (5 active tasks)
    let newAssigneeName = task.assigneeName;
    let reassigned = false;
    if (updates.assigneeId && updates.assigneeId !== task.assigneeId) {
      const newAssignee = db.getUserById(updates.assigneeId);
      if (!newAssignee) {
        throw new TaskServiceError(`Target assignee '${updates.assigneeId}' not found.`, 400);
      }

      // Check 5 active tasks constraint if task is active
      const isActive = (updates.status || task.status) !== 'COMPLETED';
      if (isActive) {
        const activeCount = db.getActiveTaskCountForUser(newAssignee.id);
        if (activeCount >= CONFIG.MAX_ACTIVE_TASKS_PER_USER) {
          throw new TaskServiceError(
            `Reassignment rejected: Member '${newAssignee.name}' already holds ${activeCount} active tasks (Limit: ${CONFIG.MAX_ACTIVE_TASKS_PER_USER}).`,
            400
          );
        }
      }

      newAssigneeName = newAssignee.name;
      reassigned = true;

      // Audit re-assignment
      auditService.logTaskAction({
        taskId: task.id,
        user: actor,
        action: 'REASSIGNED',
        fieldChanged: 'assignee',
        oldValue: `${task.assigneeName} (${task.assigneeId})`,
        newValue: `${newAssignee.name} (${newAssignee.id})`,
        details: `${actor.name} reassigned task from ${task.assigneeName} to ${newAssignee.name}`
      });

      // Notification for new assignee
      queueService.enqueueNotification({
        userId: newAssignee.id,
        task: { ...task, assigneeId: newAssignee.id, assigneeName: newAssignee.name },
        type: 'ASSIGNMENT',
        actor
      });
    }

    // Check overdue flag if due date changed
    const effectiveDueDate = updates.dueDate || task.dueDate;
    const isOverdue = task.status !== 'COMPLETED' && effectiveDueDate < new Date().toISOString();

    const updatedTask = db.updateTask(taskId, {
      title: updates.title !== undefined ? updates.title.trim() : task.title,
      description: updates.description !== undefined ? updates.description : task.description,
      priority: updates.priority || task.priority,
      dueDate: effectiveDueDate,
      assigneeId: updates.assigneeId || task.assigneeId,
      assigneeName: newAssigneeName,
      isOverdue
    });

    if (!updatedTask) {
      throw new TaskServiceError('Failed to update task.', 500);
    }

    if (!reassigned) {
      auditService.logTaskAction({
        taskId: task.id,
        user: actor,
        action: 'UPDATED',
        details: `${actor.name} updated task details`
      });
    }

    wsService.broadcast('TASK_UPDATED', updatedTask);

    return {
      ...updatedTask,
      auditHistory: auditService.getHistoryForTask(updatedTask.id)
    };
  }

  public deleteTask(taskId: string, actor: User): boolean {
    const task = db.getTaskById(taskId);
    if (!task) {
      throw new TaskServiceError(`Task with ID '${taskId}' not found.`, 404);
    }

    // Non-admin can only delete tasks they created
    if (actor.role !== 'ADMIN' && task.creatorId !== actor.id) {
      throw new TaskServiceError('Permission denied: Only an Admin/Lead or the task creator can delete this task.', 403);
    }

    auditService.logTaskAction({
      taskId,
      user: actor,
      action: 'DELETED',
      details: `${actor.name} deleted task "${task.title}"`
    });

    const deleted = db.deleteTask(taskId);
    if (deleted) {
      wsService.broadcast('TASK_DELETED', { taskId, title: task.title, deletedBy: actor.name });
    }
    return deleted;
  }
}

export const taskService = new TaskService();
