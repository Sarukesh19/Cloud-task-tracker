"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET all notifications for current user
router.get('/', auth_1.authMiddleware, (req, res) => {
    const user = req.user;
    const notifs = db_1.db.getNotificationsForUser(user.id);
    res.json(notifs);
});
// PATCH mark single notification as read
router.patch('/:id/read', auth_1.authMiddleware, (req, res) => {
    const user = req.user;
    const success = db_1.db.markNotificationAsRead(req.params.id, user.id);
    if (!success) {
        res.status(404).json({ error: 'Notification not found.' });
        return;
    }
    res.json({ success: true, id: req.params.id });
});
// POST mark all notifications as read for current user
router.post('/read-all', auth_1.authMiddleware, (req, res) => {
    const user = req.user;
    const count = db_1.db.markAllNotificationsAsRead(user.id);
    res.json({ success: true, count });
});
exports.default = router;
