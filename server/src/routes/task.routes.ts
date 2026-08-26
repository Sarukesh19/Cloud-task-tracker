import { Router, Response } from 'express';
import { taskService, TaskServiceError } from '../services/task.service';
import { auditService } from '../services/audit.service';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { TaskStatus, TaskPriority } from '../types';

const router = Router();

// GET all tasks with filtering
router.get('/', (req, res) => {
  try {
    const { search, status, priority, assigneeId, isOverdue } = req.query;
    const tasks = taskService.getTasks({
      search: search as string,
      status: status as string,
      priority: priority as string,
      assigneeId: assigneeId as string,
      isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined
    });
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET single task by id
router.get('/:id', (req, res) => {
  const task = taskService.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }
  res.json(task);
});

// GET task audit history (Constraint 6: last 3+ changes)
router.get('/:id/audit', (req, res) => {
  const history = auditService.getHistoryForTask(req.params.id);
  res.json(history);
});

// POST Create Task (Requires Auth)
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, dueDate, priority, assigneeId } = req.body;
    const user = req.user!;

    const task = taskService.createTask(
      {
        title,
        description,
        dueDate,
        priority: priority as TaskPriority,
        assigneeId: assigneeId || user.id
      },
      user
    );

    res.status(201).json(task);
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// PATCH Update Task Status (Constraint 1: Pending -> In Progress -> Completed, Constraint 2: Assignee/Admin only for Completed)
router.patch('/:id/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    const user = req.user!;

    if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      res.status(400).json({ error: 'Invalid status. Must be PENDING, IN_PROGRESS, or COMPLETED.' });
      return;
    }

    const updatedTask = taskService.updateTaskStatus(req.params.id, status as TaskStatus, user);
    res.json(updatedTask);
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// PUT Update Task Details (Constraint 3: 5 active tasks checked on reassignment)
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const updated = taskService.updateTask(req.params.id, req.body, user);
    res.json(updated);
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

// DELETE Task
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    taskService.deleteTask(req.params.id, user);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err: any) {
    if (err instanceof TaskServiceError) {
      res.status(err.statusCode).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

export default router;
