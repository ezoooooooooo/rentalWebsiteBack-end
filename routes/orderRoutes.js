const express = require("express");
const router = express.Router();
const orderController = require("../Controllers/orderController");
const { verifyToken } = require("../middleware/auth.middleware");

// Process payment and create order
router.post("/payment", verifyToken, orderController.processPayment);

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

// Update order status
router.put("/:orderId/status", verifyToken, orderController.updateOrderStatus);

module.exports = router;
