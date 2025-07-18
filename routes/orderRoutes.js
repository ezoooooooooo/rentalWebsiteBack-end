const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");
const { verifyToken } = require("../middleware/auth.middleware");

// Process payment and create order
router.post("/payment", verifyToken, orderController.processPayment);

// Calculate fee breakdown
router.post("/fee-breakdown", orderController.calculateFeeBreakdown);

// Check item availability
router.post(
  "/check-availability",
  verifyToken,
  orderController.checkAvailability
);

// Get user's orders
router.get("/my-orders", verifyToken, orderController.getUserOrders);

// Get owner's orders
router.get("/owner-orders", verifyToken, orderController.getOwnerOrders);

// Cancel order (specific endpoint for cancellation)
router.put("/:orderId/cancel", verifyToken, orderController.cancelOrder);

// Update order status (general status update)
router.put("/:orderId/status", verifyToken, orderController.updateOrderStatus);

module.exports = router;
