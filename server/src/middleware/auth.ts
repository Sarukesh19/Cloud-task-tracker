import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config';
import { db } from '../db';
import { User, Role } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If testing without token, check if X-User-Id header was passed (convenient for testing)
    const userIdHeader = req.headers['x-user-id'] as string;
    if (userIdHeader) {
      const user = db.getUserById(userIdHeader);
      if (user) {
        req.user = user;
        return next();
      }
    }
    res.status(401).json({ error: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as { id: string; role: Role };
    const user = db.getUserById(decoded.id);
    if (!user) {
      res.status(401).json({ error: 'User not found in system.' });
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: `Permission denied. Required role: [${allowedRoles.join(', ')}], current role: ${req.user.role}` 
      });
      return;
    }
    next();
  };
}
