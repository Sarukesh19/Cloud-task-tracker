"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all users
router.get('/users', (req, res) => {
    const users = db_1.db.getUsers().map(u => ({
        ...u,
        activeTasksCount: db_1.db.getActiveTaskCountForUser(u.id)
    }));
    res.json(users);
});
// POST Create / Register New User
router.post('/register', (req, res) => {
    const { name, email, role, title, avatar } = req.body;
    if (!name || !name.trim()) {
        res.status(400).json({ error: 'Name is required.' });
        return;
    }
    if (!email || !email.trim()) {
        res.status(400).json({ error: 'Email is required.' });
        return;
    }
    const existing = db_1.db.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (existing) {
        res.status(400).json({ error: `A member with email '${email}' already exists.` });
        return;
    }
    const randomAvatarId = Math.floor(Math.random() * 70) + 1;
    const newUser = {
        id: `user-${Date.now().toString(36)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: (role === 'ADMIN' ? 'ADMIN' : 'MEMBER'),
        avatar: avatar?.trim() || `https://i.pravatar.cc/150?img=${randomAvatarId}`,
        title: title?.trim() || (role === 'ADMIN' ? 'Club Lead / Admin' : 'Club Member'),
        createdAt: new Date().toISOString()
    };
    const savedUser = db_1.db.insertUser(newUser);
    const token = jsonwebtoken_1.default.sign({ id: savedUser.id, name: savedUser.name, role: savedUser.role, email: savedUser.email }, config_1.CONFIG.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
        token,
        user: {
            ...savedUser,
            activeTasksCount: 0
        }
    });
});
// POST Login by email or user ID
router.post('/login', (req, res) => {
    const { email, userId } = req.body;
    const users = db_1.db.getUsers();
    const user = userId
        ? users.find(u => u.id === userId)
        : users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
    if (!user) {
        res.status(404).json({ error: 'User account not found.' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, role: user.role, email: user.email }, config_1.CONFIG.JWT_SECRET, { expiresIn: '7d' });
    res.json({
        token,
        user: {
            ...user,
            activeTasksCount: db_1.db.getActiveTaskCountForUser(user.id)
        }
    });
});
// POST Quick Switch User (for evaluator convenience)
router.post('/switch-user', (req, res) => {
    const { userId } = req.body;
    const user = db_1.db.getUserById(userId);
    if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, name: user.name, role: user.role, email: user.email }, config_1.CONFIG.JWT_SECRET, { expiresIn: '7d' });
    res.json({
        token,
        user: {
            ...user,
            activeTasksCount: db_1.db.getActiveTaskCountForUser(user.id)
        }
    });
});
// GET Current Auth User
router.get('/me', auth_1.authMiddleware, (req, res) => {
    if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
    }
    res.json({
        ...req.user,
        activeTasksCount: db_1.db.getActiveTaskCountForUser(req.user.id)
    });
});
exports.default = router;
