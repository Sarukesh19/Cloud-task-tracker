"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const INITIAL_USERS = [
    {
        id: 'user-admin-1',
        name: 'Alex Lead',
        email: 'alex.lead@clubtech.edu',
        role: 'ADMIN',
        avatar: '',
        title: 'Club President / Lead Architect',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    {
        id: 'user-member-1',
        name: 'Sarah Chen',
        email: 'sarah.chen@clubtech.edu',
        role: 'MEMBER',
        avatar: '',
        title: 'Frontend Developer',
        createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
    },
    {
        id: 'user-member-2',
        name: 'Timmy Miller',
        email: 'timmy.miller@clubtech.edu',
        role: 'MEMBER',
        avatar: '',
        title: 'Backend Engineer',
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString()
    },
    {
        id: 'user-member-3',
        name: 'Jordan Taylor',
        email: 'jordan.taylor@clubtech.edu',
        role: 'MEMBER',
        avatar: '',
        title: 'UI/UX Specialist',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
    },
    {
        id: 'user-member-4',
        name: 'Morgan Blake',
        email: 'morgan.blake@clubtech.edu',
        role: 'MEMBER',
        avatar: '',
        title: 'DevOps & QA',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
    }
];
function generateInitialSeed() {
    const now = Date.now();
    const tasks = [
        {
            id: 'task-101',
            title: 'Design Dark Mode Design Tokens & Components',
            description: 'Create responsive glassmorphic components and theme switchers for the campus hackathon portal.',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            assigneeId: 'user-member-1',
            assigneeName: 'Sarah Chen',
            creatorId: 'user-admin-1',
            creatorName: 'Alex Lead',
            dueDate: new Date(now + 2 * 86400000).toISOString(),
            isOverdue: false,
            createdAt: new Date(now - 3 * 86400000).toISOString(),
            updatedAt: new Date(now - 1 * 86400000).toISOString()
        },
        {
            id: 'task-102',
            title: 'Implement Role-Based JWT Authorization Engine',
            description: 'Enforce strict role checks and granular token permission claims across API middleware.',
            status: 'COMPLETED',
            priority: 'URGENT',
            assigneeId: 'user-member-2',
            assigneeName: 'Timmy Miller',
            creatorId: 'user-admin-1',
            creatorName: 'Alex Lead',
            dueDate: new Date(now - 1 * 86400000).toISOString(),
            isOverdue: false,
            createdAt: new Date(now - 5 * 86400000).toISOString(),
            updatedAt: new Date(now - 2 * 86400000).toISOString()
        },
        {
            id: 'task-103',
            title: 'Setup Automated CI/CD Pipeline & Health Probes',
            description: 'Configure GitHub Actions for automated linting, test suite execution, and containerized deployment.',
            status: 'PENDING',
            priority: 'MEDIUM',
            assigneeId: 'user-member-4',
            assigneeName: 'Morgan Blake',
            creatorId: 'user-admin-1',
            creatorName: 'Alex Lead',
            dueDate: new Date(now + 4 * 86400000).toISOString(),
            isOverdue: false,
            createdAt: new Date(now - 2 * 86400000).toISOString(),
            updatedAt: new Date(now - 2 * 86400000).toISOString()
        },
        {
            id: 'task-104',
            title: 'Overdue Project Charter Review & Budget Signoff',
            description: 'Review departmental equipment expenditures and submit the final invoice to university finance.',
            status: 'PENDING',
            priority: 'URGENT',
            assigneeId: 'user-member-3',
            assigneeName: 'Jordan Taylor',
            creatorId: 'user-admin-1',
            creatorName: 'Alex Lead',
            dueDate: new Date(now - 12 * 3600000).toISOString(), // 12 hours ago (Overdue!)
            isOverdue: true,
            createdAt: new Date(now - 4 * 86400000).toISOString(),
            updatedAt: new Date(now - 12 * 3600000).toISOString()
        },
        {
            id: 'task-105',
            title: 'Conduct Interactive Usability Testing with Beta Cohort',
            description: 'Run 5 interactive pair-sessions with club freshmen to identify friction points in task assignments.',
            status: 'IN_PROGRESS',
            priority: 'LOW',
            assigneeId: 'user-member-3',
            assigneeName: 'Jordan Taylor',
            creatorId: 'user-admin-1',
            creatorName: 'Alex Lead',
            dueDate: new Date(now + 5 * 86400000).toISOString(),
            isOverdue: false,
            createdAt: new Date(now - 1 * 86400000).toISOString(),
            updatedAt: new Date(now - 4 * 3600000).toISOString()
        }
    ];
    const auditLogs = [
        {
            id: 'audit-1',
            taskId: 'task-101',
            userId: 'user-admin-1',
            userName: 'Alex Lead',
            userRole: 'ADMIN',
            action: 'CREATED',
            timestamp: new Date(now - 3 * 86400000).toISOString(),
            details: 'Task created and assigned to Sarah Chen'
        },
        {
            id: 'audit-2',
            taskId: 'task-101',
            userId: 'user-member-1',
            userName: 'Sarah Chen',
            userRole: 'MEMBER',
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: 'PENDING',
            newValue: 'IN_PROGRESS',
            timestamp: new Date(now - 1 * 86400000).toISOString(),
            details: 'Sarah started working on UI tokens'
        },
        {
            id: 'audit-3',
            taskId: 'task-102',
            userId: 'user-admin-1',
            userName: 'Alex Lead',
            userRole: 'ADMIN',
            action: 'CREATED',
            timestamp: new Date(now - 5 * 86400000).toISOString(),
            details: 'Task created and assigned to Timmy Miller'
        },
        {
            id: 'audit-4',
            taskId: 'task-102',
            userId: 'user-member-2',
            userName: 'Timmy Miller',
            userRole: 'MEMBER',
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: 'PENDING',
            newValue: 'IN_PROGRESS',
            timestamp: new Date(now - 4 * 86400000).toISOString(),
            details: 'Timmy picked up JWT implementation'
        },
        {
            id: 'audit-5',
            taskId: 'task-102',
            userId: 'user-member-2',
            userName: 'Timmy Miller',
            userRole: 'MEMBER',
            action: 'STATUS_CHANGE',
            fieldChanged: 'status',
            oldValue: 'IN_PROGRESS',
            newValue: 'COMPLETED',
            timestamp: new Date(now - 2 * 86400000).toISOString(),
            details: 'Timmy completed tests and verified JWT security'
        },
        {
            id: 'audit-6',
            taskId: 'task-104',
            userId: 'user-admin-1',
            userName: 'Alex Lead',
            userRole: 'ADMIN',
            action: 'OVERDUE_FLAGGED',
            fieldChanged: 'isOverdue',
            oldValue: 'false',
            newValue: 'true',
            timestamp: new Date(now - 12 * 3600000).toISOString(),
            details: 'Task auto-flagged as overdue by system monitor'
        }
    ];
    const notifications = [
        {
            id: 'notif-1',
            userId: 'user-member-1',
            taskId: 'task-101',
            taskTitle: 'Design Dark Mode Design Tokens & Components',
            type: 'ASSIGNMENT',
            title: 'New Mission Assigned 🚀',
            message: 'Alex Lead assigned you "Design Dark Mode Design Tokens & Components"',
            read: true,
            createdAt: new Date(now - 3 * 86400000).toISOString()
        },
        {
            id: 'notif-2',
            userId: 'user-member-3',
            taskId: 'task-104',
            taskTitle: 'Overdue Project Charter Review & Budget Signoff',
            type: 'OVERDUE',
            title: 'Urgent: Task Overdue 🚨',
            message: '"Overdue Project Charter Review & Budget Signoff" has passed its due date!',
            read: false,
            createdAt: new Date(now - 12 * 3600000).toISOString()
        }
    ];
    return {
        users: INITIAL_USERS,
        tasks,
        auditLogs,
        notifications,
        emailOutbox: [],
        queueJobs: [],
        settings: {
            simulateQueueFailures: false
        }
    };
}
class Database {
    data;
    dbFilePath;
    constructor() {
        this.dbFilePath = config_1.CONFIG.DB_PATH;
        const dir = path_1.default.dirname(this.dbFilePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        if (fs_1.default.existsSync(this.dbFilePath)) {
            try {
                const raw = fs_1.default.readFileSync(this.dbFilePath, 'utf-8');
                this.data = JSON.parse(raw);
                // Ensure user list has all initial users
                if (!this.data.users || this.data.users.length === 0) {
                    this.data = generateInitialSeed();
                    this.save();
                }
            }
            catch (err) {
                console.warn('Failed to load existing db.json, generating fresh seed:', err);
                this.data = generateInitialSeed();
                this.save();
            }
        }
        else {
            this.data = generateInitialSeed();
            this.save();
        }
    }
    save() {
        try {
            fs_1.default.writeFileSync(this.dbFilePath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Error saving database to file:', err);
        }
    }
    resetToSeed() {
        this.data = generateInitialSeed();
        this.save();
        return this.data;
    }
    // User Operations
    getUsers() {
        return [...this.data.users];
    }
    getUserById(id) {
        return this.data.users.find(u => u.id === id);
    }
    insertUser(user) {
        this.data.users.push(user);
        this.save();
        return user;
    }
    // Task Operations
    getTasks() {
        return [...this.data.tasks];
    }
    getTaskById(id) {
        return this.data.tasks.find(t => t.id === id);
    }
    getActiveTaskCountForUser(userId) {
        return this.data.tasks.filter(t => t.assigneeId === userId && (t.status === 'PENDING' || t.status === 'IN_PROGRESS')).length;
    }
    insertTask(task) {
        this.data.tasks.unshift(task);
        this.save();
        return task;
    }
    updateTask(id, updates) {
        const idx = this.data.tasks.findIndex(t => t.id === id);
        if (idx === -1)
            return null;
        this.data.tasks[idx] = {
            ...this.data.tasks[idx],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        this.save();
        return this.data.tasks[idx];
    }
    deleteTask(id) {
        const initialLen = this.data.tasks.length;
        this.data.tasks = this.data.tasks.filter(t => t.id !== id);
        if (this.data.tasks.length !== initialLen) {
            this.save();
            return true;
        }
        return false;
    }
    // Audit Operations
    insertAuditLog(log) {
        this.data.auditLogs.unshift(log);
        this.save();
        return log;
    }
    getAuditLogsForTask(taskId) {
        return this.data.auditLogs
            .filter(a => a.taskId === taskId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    getAllAuditLogs(limit = 100) {
        return this.data.auditLogs
            .slice(0, limit)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    // Notification Operations
    insertNotification(notification) {
        this.data.notifications.unshift(notification);
        this.save();
        return notification;
    }
    getNotificationsForUser(userId) {
        return this.data.notifications
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    markNotificationAsRead(id, userId) {
        const notif = this.data.notifications.find(n => n.id === id && n.userId === userId);
        if (notif) {
            notif.read = true;
            this.save();
            return true;
        }
        return false;
    }
    markAllNotificationsAsRead(userId) {
        let count = 0;
        for (const n of this.data.notifications) {
            if (n.userId === userId && !n.read) {
                n.read = true;
                count++;
            }
        }
        if (count > 0)
            this.save();
        return count;
    }
    // Queue Operations
    insertQueueJob(job) {
        this.data.queueJobs.unshift(job);
        this.save();
        return job;
    }
    updateQueueJob(id, updates) {
        const idx = this.data.queueJobs.findIndex(j => j.id === id);
        if (idx === -1)
            return null;
        this.data.queueJobs[idx] = { ...this.data.queueJobs[idx], ...updates };
        this.save();
        return this.data.queueJobs[idx];
    }
    getQueueJobs(limit = 50) {
        return this.data.queueJobs.slice(0, limit);
    }
    getPendingQueueJobs() {
        const now = new Date().toISOString();
        return this.data.queueJobs.filter(j => (j.status === 'QUEUED' || j.status === 'RETRYING') && (!j.nextRunAt || j.nextRunAt <= now));
    }
    // Email Outbox Operations
    insertEmailOutbox(email) {
        this.data.emailOutbox.unshift(email);
        this.save();
        return email;
    }
    getEmailOutbox(limit = 50) {
        return this.data.emailOutbox.slice(0, limit);
    }
    // Settings
    getSimulateQueueFailures() {
        return !!this.data.settings?.simulateQueueFailures;
    }
    setSimulateQueueFailures(enabled) {
        if (!this.data.settings)
            this.data.settings = { simulateQueueFailures: false };
        this.data.settings.simulateQueueFailures = enabled;
        this.save();
    }
}
exports.db = new Database();
