"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const task_service_1 = require("../services/task.service");
const audit_service_1 = require("../services/audit.service");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all tasks with filtering
router.get('/', (req, res) => {
    try {
        const { search, status, priority, assigneeId, isOverdue } = req.query;
        const tasks = task_service_1.taskService.getTasks({
            search: search,
            status: status,
            priority: priority,
            assigneeId: assigneeId,
            isOverdue: isOverdue !== undefined ? isOverdue === 'true' : undefined
        });
        res.json(tasks);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// GET single task by id
router.get('/:id', (req, res) => {
    const task = task_service_1.taskService.getTaskById(req.params.id);
    if (!task) {
        res.status(404).json({ error: 'Task not found.' });
        return;
    }
    res.json(task);
});
// GET task audit history (Constraint 6: last 3+ changes)
router.get('/:id/audit', (req, res) => {
    const history = audit_service_1.auditService.getHistoryForTask(req.params.id);
    res.json(history);
});
// POST Create Task (Requires Auth)
router.post('/', auth_1.authMiddleware, (req, res) => {
    try {
        const { title, description, dueDate, priority, assigneeId } = req.body;
        const user = req.user;
        const task = task_service_1.taskService.createTask({
            title,
            description,
            dueDate,
            priority: priority,
            assigneeId: assigneeId || user.id
        }, user);
        res.status(201).json(task);
    }
    catch (err) {
        if (err instanceof task_service_1.TaskServiceError) {
            res.status(err.statusCode).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
});
// PATCH Update Task Status (Constraint 1: Pending -> In Progress -> Completed, Constraint 2: Assignee/Admin only for Completed)
router.patch('/:id/status', auth_1.authMiddleware, (req, res) => {
    try {
        const { status } = req.body;
        const user = req.user;
        if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
            res.status(400).json({ error: 'Invalid status. Must be PENDING, IN_PROGRESS, or COMPLETED.' });
            return;
        }
        const updatedTask = task_service_1.taskService.updateTaskStatus(req.params.id, status, user);
        res.json(updatedTask);
    }
    catch (err) {
        if (err instanceof task_service_1.TaskServiceError) {
            res.status(err.statusCode).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
});
// PUT Update Task Details (Constraint 3: 5 active tasks checked on reassignment)
router.put('/:id', auth_1.authMiddleware, (req, res) => {
    try {
        const user = req.user;
        const updated = task_service_1.taskService.updateTask(req.params.id, req.body, user);
        res.json(updated);
    }
    catch (err) {
        if (err instanceof task_service_1.TaskServiceError) {
            res.status(err.statusCode).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
});
// DELETE Task
router.delete('/:id', auth_1.authMiddleware, (req, res) => {
    try {
        const user = req.user;
        task_service_1.taskService.deleteTask(req.params.id, user);
        res.json({ success: true, message: 'Task deleted successfully.' });
    }
    catch (err) {
        if (err instanceof task_service_1.TaskServiceError) {
            res.status(err.statusCode).json({ error: err.message });
        }
        else {
            res.status(500).json({ error: err.message || 'Internal server error' });
        }
    }
});
exports.default = router;
