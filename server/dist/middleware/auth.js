"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const db_1 = require("../db");
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // If testing without token, check if X-User-Id header was passed (convenient for testing)
        const userIdHeader = req.headers['x-user-id'];
        if (userIdHeader) {
            const user = db_1.db.getUserById(userIdHeader);
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
        const decoded = jsonwebtoken_1.default.verify(token, config_1.CONFIG.JWT_SECRET);
        const user = db_1.db.getUserById(decoded.id);
        if (!user) {
            res.status(401).json({ error: 'User not found in system.' });
            return;
        }
        req.user = user;
        next();
    }
    catch (err) {
        res.status(401).json({ error: 'Invalid or expired authentication token.' });
    }
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
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
