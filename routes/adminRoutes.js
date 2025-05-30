const express = require('express');
const router = express.Router();
const adminController = require('../Controllers/adminController');
const { isAdmin } = require('../middleware/admin.middleware');

// Apply admin middleware to all routes
router.use(isAdmin);

// Dashboard
router.get('/dashboard/stats', adminController.getDashboardStats);

// Order Management
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:orderId/status', adminController.updateOrderStatus);
router.post('/orders/batch-update', adminController.batchUpdateOrders);

// User Management
router.get('/users', adminController.getAllUsers);
router.get('/users/:userId', adminController.getUserDetails);
router.put('/users/:userId/role', adminController.updateUserRole);

// Listing Management
router.get('/listings', adminController.getAllListings);
router.put('/listings/:listingId/status', adminController.updateListingStatus);

// Analytics
router.get('/analytics/revenue', adminController.getRevenueAnalytics);
router.get('/analytics/popular-listings', adminController.getPopularListings);
router.get('/analytics/user-activity', adminController.getUserActivityStats);
router.get('/analytics/category-performance', adminController.getCategoryPerformance);
router.get('/analytics/order-status', adminController.getOrderStatus);

module.exports = router;
