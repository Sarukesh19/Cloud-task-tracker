import { Router, Response } from 'express';
import { db } from '../db';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all notifications for current user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const notifs = db.getNotificationsForUser(user.id);
  res.json(notifs);
});

// PATCH mark single notification as read
router.patch('/:id/read', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const success = db.markNotificationAsRead(req.params.id, user.id);
  if (!success) {
    res.status(404).json({ error: 'Notification not found.' });
    return;
  }
  res.json({ success: true, id: req.params.id });
});

// POST mark all notifications as read for current user
router.post('/read-all', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const count = db.markAllNotificationsAsRead(user.id);
  res.json({ success: true, count });
});

export default router;
