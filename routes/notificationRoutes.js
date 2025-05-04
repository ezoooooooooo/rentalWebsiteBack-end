const express = require('express');
const router = express.Router();
const notificationController = require('../Controllers/notificationController');
const { verifyToken } = require('../middleware/auth.middleware');

// Get all notifications for the current user
router.get('/', verifyToken, notificationController.getUserNotifications);

// Get unread notifications count
router.get('/unread-count', verifyToken, notificationController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', verifyToken, notificationController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', verifyToken, notificationController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', verifyToken, notificationController.deleteNotification);

module.exports = router;
