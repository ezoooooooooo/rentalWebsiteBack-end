const Notification = require('../Models/Notification');

// Get all notifications for the current user
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Find all notifications where the current user is the recipient
    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'firstName lastName')
      .populate({
        path: 'order',
        populate: {
          path: 'listing',
          select: 'name images'
        }
      })
      .sort({ createdAt: -1 }); // Sort by newest first
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

// Get unread notifications count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Count unread notifications
    const count = await Notification.countDocuments({ 
      recipient: userId,
      read: false
    });
    
    res.status(200).json({ unreadCount: count });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    res.status(500).json({ message: 'Error counting notifications', error: error.message });
  }
};

// Mark notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    // Find the notification and ensure it belongs to the current user
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }
    
    // Mark as read
    notification.read = true;
    await notification.save();
    
    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    );
    
    res.status(200).json({ 
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    // Find and delete the notification, ensuring it belongs to the current user
    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!result) {
      return res.status(404).json({ message: 'Notification not found or not authorized' });
    }
    
    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Error deleting notification', error: error.message });
  }
};
