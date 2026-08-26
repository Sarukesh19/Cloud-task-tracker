"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskService = exports.TaskServiceError = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../db");
const config_1 = require("../config");
const audit_service_1 = require("./audit.service");
const queue_service_1 = require("./queue.service");
const websocket_service_1 = require("./websocket.service");
class TaskServiceError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, TaskServiceError.prototype);
    }
}
exports.TaskServiceError = TaskServiceError;
class TaskService {
    /**
     * Get all tasks with full search & filtering support
     */
    getTasks(filters) {
        let tasks = db_1.db.getTasks();
        if (filters.search) {
            const q = filters.search.toLowerCase();
            tasks = tasks.filter(t => t.title.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                t.assigneeName.toLowerCase().includes(q));
        }
        if (filters.status) {
            if (filters.status === 'OVERDUE') {
                tasks = tasks.filter(t => t.isOverdue && t.status !== 'COMPLETED');
            }
            else {
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
            auditHistory: audit_service_1.auditService.getHistoryForTask(t.id).slice(0, 5)
        }));
    }
    getTaskById(id) {
        const task = db_1.db.getTaskById(id);
        if (!task)
            return null;
        return {
            ...task,
            auditHistory: audit_service_1.auditService.getHistoryForTask(id)
        };
    }
    /**
     * Create a new task with Constraint 3 check (max 5 active tasks)
     */
    createTask(data, creator) {
        if (!data.title || !data.title.trim()) {
            throw new TaskServiceError('Task title is required.', 400);
        }
        const assignee = db_1.db.getUserById(data.assigneeId);
        if (!assignee) {
            throw new TaskServiceError(`Assignee user '${data.assigneeId}' does not exist.`, 400);
        }
        // CONSTRAINT 3: Max 5 active tasks per user
        const activeTasksCount = db_1.db.getActiveTaskCountForUser(data.assigneeId);
        if (activeTasksCount >= config_1.CONFIG.MAX_ACTIVE_TASKS_PER_USER) {
            throw new TaskServiceError(`Assignment rejected: Member '${assignee.name}' already has ${activeTasksCount} active tasks (Pending/In Progress). Maximum allowed active tasks per member is ${config_1.CONFIG.MAX_ACTIVE_TASKS_PER_USER}.`, 400);
        }
        const now = new Date().toISOString();
        const isOverdue = data.dueDate ? data.dueDate < now : false;
        const newTask = {
            id: `task-${(0, uuid_1.v4)().substring(0, 8)}`,
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
        const savedTask = db_1.db.insertTask(newTask);
        // Audit log
        audit_service_1.auditService.logTaskAction({
            taskId: savedTask.id,
            user: creator,
            action: 'CREATED',
            details: `Task created and assigned to ${assignee.name} (Priority: ${savedTask.priority})`
        });
        // Enqueue Assignment Notification
        queue_service_1.queueService.enqueueNotification({
            userId: assignee.id,
            task: savedTask,
            type: 'ASSIGNMENT',
            actor: creator
        });
        // Real-time broadcast
        websocket_service_1.wsService.broadcast('TASK_CREATED', savedTask);
        return {
            ...savedTask,
            auditHistory: audit_service_1.auditService.getHistoryForTask(savedTask.id)
        };
    }
    /**
     * Update task status with Constraints 1 & 2
     */
    updateTaskStatus(taskId, newStatus, actor) {
        const task = db_1.db.getTaskById(taskId);
        if (!task) {
            throw new TaskServiceError(`Task with ID '${taskId}' not found.`, 404);
        }
        const currentStatus = task.status;
        if (currentStatus === newStatus) {
            return task;
        }
        // CONSTRAINT 1: A task can't skip from Pending straight to Completed — it must pass through In Progress
        if (currentStatus === 'PENDING' && newStatus === 'COMPLETED') {
            throw new TaskServiceError('Invalid state transition: A task cannot skip from Pending directly to Completed. It must pass through In Progress first.', 400);
        }
        // CONSTRAINT 2: Only the assignee or an admin/lead may mark a task Completed, enforced server-side
        if (newStatus === 'COMPLETED') {
            const isAssignee = task.assigneeId === actor.id;
            const isAdmin = actor.role === 'ADMIN';
            if (!isAssignee && !isAdmin) {
                throw new TaskServiceError(`Permission denied: Only the task assignee (${task.assigneeName}) or an Admin/Lead can mark this task as Completed. Current user: ${actor.name} (${actor.role}).`, 403);
            }
        }
        // Update status
        const isNowCompleted = newStatus === 'COMPLETED';
        const updated = db_1.db.updateTask(taskId, {
            status: newStatus,
            isOverdue: isNowCompleted ? false : task.isOverdue
        });
        if (!updated) {
            throw new TaskServiceError('Failed to update task status.', 500);
        }
        // Audit log
        audit_service_1.auditService.logTaskAction({
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
            queue_service_1.queueService.enqueueNotification({
                userId: targetUserId,
                task: updated,
                type: 'STATUS_CHANGE',
                actor,
                previousStatus: currentStatus
            });
        }
        // Broadcast live event
        websocket_service_1.wsService.broadcast('TASK_STATUS_CHANGED', {
            task: updated,
            oldStatus: currentStatus,
            newStatus: newStatus,
            updatedBy: actor.name
        });
        return {
            ...updated,
            auditHistory: audit_service_1.auditService.getHistoryForTask(updated.id)
        };
    }
    /**
     * General task update (title, description, priority, dueDate, assignee)
     */
    updateTask(taskId, updates, actor) {
        const task = db_1.db.getTaskById(taskId);
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
            const newAssignee = db_1.db.getUserById(updates.assigneeId);
            if (!newAssignee) {
                throw new TaskServiceError(`Target assignee '${updates.assigneeId}' not found.`, 400);
            }
            // Check 5 active tasks constraint if task is active
            const isActive = (updates.status || task.status) !== 'COMPLETED';
            if (isActive) {
                const activeCount = db_1.db.getActiveTaskCountForUser(newAssignee.id);
                if (activeCount >= config_1.CONFIG.MAX_ACTIVE_TASKS_PER_USER) {
                    throw new TaskServiceError(`Reassignment rejected: Member '${newAssignee.name}' already holds ${activeCount} active tasks (Limit: ${config_1.CONFIG.MAX_ACTIVE_TASKS_PER_USER}).`, 400);
                }
            }
            newAssigneeName = newAssignee.name;
            reassigned = true;
            // Audit re-assignment
            audit_service_1.auditService.logTaskAction({
                taskId: task.id,
                user: actor,
                action: 'REASSIGNED',
                fieldChanged: 'assignee',
                oldValue: `${task.assigneeName} (${task.assigneeId})`,
                newValue: `${newAssignee.name} (${newAssignee.id})`,
                details: `${actor.name} reassigned task from ${task.assigneeName} to ${newAssignee.name}`
            });
            // Notification for new assignee
            queue_service_1.queueService.enqueueNotification({
                userId: newAssignee.id,
                task: { ...task, assigneeId: newAssignee.id, assigneeName: newAssignee.name },
                type: 'ASSIGNMENT',
                actor
            });
        }
        // Check overdue flag if due date changed
        const effectiveDueDate = updates.dueDate || task.dueDate;
        const isOverdue = task.status !== 'COMPLETED' && effectiveDueDate < new Date().toISOString();
        const updatedTask = db_1.db.updateTask(taskId, {
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
            audit_service_1.auditService.logTaskAction({
                taskId: task.id,
                user: actor,
                action: 'UPDATED',
                details: `${actor.name} updated task details`
            });
        }
        websocket_service_1.wsService.broadcast('TASK_UPDATED', updatedTask);
        return {
            ...updatedTask,
            auditHistory: audit_service_1.auditService.getHistoryForTask(updatedTask.id)
        };
    }
    deleteTask(taskId, actor) {
        const task = db_1.db.getTaskById(taskId);
        if (!task) {
            throw new TaskServiceError(`Task with ID '${taskId}' not found.`, 404);
        }
        // Non-admin can only delete tasks they created
        if (actor.role !== 'ADMIN' && task.creatorId !== actor.id) {
            throw new TaskServiceError('Permission denied: Only an Admin/Lead or the task creator can delete this task.', 403);
        }
        audit_service_1.auditService.logTaskAction({
            taskId,
            user: actor,
            action: 'DELETED',
            details: `${actor.name} deleted task "${task.title}"`
        });
        const deleted = db_1.db.deleteTask(taskId);
        if (deleted) {
            websocket_service_1.wsService.broadcast('TASK_DELETED', { taskId, title: task.title, deletedBy: actor.name });
        }
        return deleted;
    }
}
exports.taskService = new TaskService();
