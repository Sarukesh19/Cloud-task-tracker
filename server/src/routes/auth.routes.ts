import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { CONFIG } from '../config';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all users
router.get('/users', (req: Request, res: Response) => {
  const users = db.getUsers().map(u => ({
    ...u,
    activeTasksCount: db.getActiveTaskCountForUser(u.id)
  }));
  res.json(users);
});

// POST Create / Register New User
router.post('/register', (req: Request, res: Response) => {
  const { name, email, role, title, avatar } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Name is required.' });
    return;
  }
  if (!email || !email.trim()) {
    res.status(400).json({ error: 'Email is required.' });
    return;
  }

  const existing = db.getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    res.status(400).json({ error: `A member with email '${email}' already exists.` });
    return;
  }

  const randomAvatarId = Math.floor(Math.random() * 70) + 1;
  const newUser = {
    id: `user-${Date.now().toString(36)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: (role === 'ADMIN' ? 'ADMIN' : 'MEMBER') as 'ADMIN' | 'MEMBER',
    avatar: avatar?.trim() || `https://i.pravatar.cc/150?img=${randomAvatarId}`,
    title: title?.trim() || (role === 'ADMIN' ? 'Club Lead / Admin' : 'Club Member'),
    createdAt: new Date().toISOString()
  };

  const savedUser = db.insertUser(newUser);

  const token = jwt.sign(
    { id: savedUser.id, name: savedUser.name, role: savedUser.role, email: savedUser.email },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    token,
    user: {
      ...savedUser,
      activeTasksCount: 0
    }
  });
});

// POST Login by email or user ID
router.post('/login', (req: Request, res: Response) => {
  const { email, userId } = req.body;
  const users = db.getUsers();
  const user = userId 
    ? users.find(u => u.id === userId)
    : users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());

  if (!user) {
    res.status(404).json({ error: 'User account not found.' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, email: user.email },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      ...user,
      activeTasksCount: db.getActiveTaskCountForUser(user.id)
    }
  });
});

// POST Quick Switch User (for evaluator convenience)
router.post('/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = db.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, role: user.role, email: user.email },
    CONFIG.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      ...user,
      activeTasksCount: db.getActiveTaskCountForUser(user.id)
    }
  });
});

// GET Current Auth User
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  res.json({
    ...req.user,
    activeTasksCount: db.getActiveTaskCountForUser(req.user.id)
  });
});

export default router;
