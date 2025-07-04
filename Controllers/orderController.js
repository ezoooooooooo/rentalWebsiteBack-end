const Order = require("../Models/Order");
const Notification = require("../Models/Notification");
const Listing = require("../Models/Listing");
const Cart = require("../Models/Cart");

// Process payment and create order
exports.processPayment = async (req, res) => {
  try {
    const { cartId, startDate, endDate, rentalDays, totalPrice: requestTotalPrice } = req.body;
    const userId = req.user.userId;



    // Get cart items with fully populated listing data
    const cart = await Cart.findById(cartId).populate({
      path: "items.listing"
    });
    
    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    if (cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    

    // Check if any items are already rented
    for (const item of cart.items) {
      if (!item.listing) {
        return res.status(400).json({ message: "Invalid listing in cart" });
      }

      const activeOrders = await Order.find({
        listing: item.listing._id,
        isActive: true,
        $or: [
          { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
          { startDate: { $gte: startDate, $lte: endDate } },
        ],
      });

      if (activeOrders.length > 0) {
        return res.status(400).json({
          message: `Item ${item.listing.name || 'Unknown'} is already rented for the selected period`,
        });
      }
    }

    // Create orders for each item in cart
    const orders = [];
    
    for (const item of cart.items) {
      try {
        // Explicitly fetch the full listing to ensure we have all fields
        const listing = await Listing.findById(item.listing._id);
        if (!listing) {
          console.error("Listing not found:", item.listing._id);
          continue;
        }
        
        // Calculate the total price for this item
        const itemRentalDays = item.rentalDays || rentalDays || 1;
        
        // Use the totalPrice from the request if provided, otherwise calculate it
        let subtotal;
        
        if (requestTotalPrice) {
          // If a single totalPrice is provided for all items, divide it proportionally
          if (cart.items.length > 1) {
            const thisItemRate = listing.rentalRate * itemRentalDays;
            const allItemsTotal = cart.items.reduce((sum, cartItem) => {
              return sum + (cartItem.listing.rentalRate * (cartItem.rentalDays || rentalDays || 1));
            }, 0);
            
            // Calculate subtotal (base price without fees)
            subtotal = Math.round((thisItemRate / allItemsTotal) * (requestTotalPrice / 1.2)); // Divide by 1.2 to get base price (since total includes 20% fees)
          } else {
            // If there's only one item, calculate subtotal from provided total
            subtotal = Math.round(requestTotalPrice / 1.2); // Remove both 10% fees to get base price
          }
        } else {
          // Calculate based on rental rate and days
          subtotal = listing.rentalRate * itemRentalDays;
        }
        
        // Calculate both fees (10% each)
        const platformFee = Math.round(subtotal * 0.1);
        const insuranceFee = Math.round(subtotal * 0.1);
        
        // Calculate total price (subtotal + both fees)
        const itemTotalPrice = subtotal + platformFee + insuranceFee;
        
        // Ensure we have a valid totalPrice (minimum 1)
        const finalTotalPrice = Math.max(1, itemTotalPrice);
        

        
        // Generate start and end dates if they're not provided
        const currentDate = new Date();
        const calculatedEndDate = new Date(currentDate);
        calculatedEndDate.setDate(calculatedEndDate.getDate() + itemRentalDays);
        
        const orderData = {
          user: userId,
          listing: listing._id,
          owner: listing.owner,
          startDate: startDate ? new Date(startDate) : currentDate,
          endDate: endDate ? new Date(endDate) : calculatedEndDate,
          rentalDays: itemRentalDays,
          subtotal: subtotal,
          platformFee: platformFee,
          insuranceFee: insuranceFee,
          totalPrice: finalTotalPrice,
          paymentStatus: "completed",
          status: "pending",
          isActive: true
        };
        
        const order = new Order(orderData);
        const savedOrder = await order.save();
        
        // Update the listing status to 'reserved'
        listing.status = "reserved";
        
        // Use the order's endDate for reservedUntil
        listing.reservedUntil = orderData.endDate;
        
        try {
          await listing.save();

        } catch (listingError) {
          console.warn("Error updating listing status:", listingError);
          // Continue with the order creation even if listing update fails
        }
        
        orders.push(savedOrder);

        // Create notification for the owner
        const notification = new Notification({
          recipient: listing.owner,
          sender: userId,
          type: "order_request",
          order: savedOrder._id,
          message: `New rental request for ${listing.name}`,
        });

        await notification.save();
      } catch (error) {
        console.error("Error creating order for item:", error);
        console.error("Item details:", JSON.stringify(item, null, 2));
      }
    }

    if (orders.length === 0) {
      return res.status(400).json({ message: "Failed to create any orders" });
    }

    // Clear the cart after successful payment
    await Cart.findByIdAndUpdate(cartId, { items: [] });

    res.status(201).json({
      message: "Payment processed and orders created successfully",
      orders,
    });
  } catch (error) {
    console.error("Payment processing error:", error);
    res
      .status(500)
      .json({ message: "Error processing payment", error: error.message });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .populate("listing")
      .populate("owner", "firstName lastName email");
    res.json(orders);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

// Get owner's orders
exports.getOwnerOrders = async (req, res) => {
  try {
    const userId = req.user.userId;

    
    // Find orders where this user is the owner
    const orders = await Order.find({ owner: userId })
      .populate("listing")
      .populate("user", "firstName lastName email");
    
    
    
    // If no orders found, let's check if there are any orders at all
    if (orders.length === 0) {
      const allOrders = await Order.find({}).select('_id owner');
      // Check if the user owns any listings
      const userListings = await Listing.find({ owner: userId }).select('_id');
    }
    
    res.json(orders);
  } catch (error) {
    console.error("Error fetching owner orders:", error);
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

// Cancel order (dedicated endpoint)
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    const order = await Order.findById(orderId).populate("listing");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Only allow the user who made the order to cancel it
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    // Check if order can be cancelled
    if (order.status === "completed") {
      return res.status(400).json({ message: "Cannot cancel completed orders" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Order is already cancelled" });
    }

    // Ensure backward compatibility for existing orders
    if (!order.subtotal && order.totalPrice) {
      order.subtotal = Math.round(order.totalPrice / 1.2);
    }
    if (!order.platformFee && order.subtotal) {
      order.platformFee = Math.round(order.subtotal * 0.1);
    }
    if (!order.insuranceFee && order.subtotal) {
      order.insuranceFee = Math.round(order.subtotal * 0.1);
    }

    // Update order status to cancelled
    order.status = "cancelled";
    order.isActive = false;
    
    // Update listing status back to available
    if (order.listing) {
      const listing = await Listing.findById(order.listing._id);
      if (listing) {
        listing.status = "available";
        listing.reservedUntil = null;
        await listing.save();
      }
    }
    
    await order.save();

    // Create notification for the owner
    const notification = new Notification({
      recipient: order.owner,
      sender: userId,
      type: "order_cancelled",
      order: order._id,
      message: `Order for ${order.listing?.name || 'the item'} has been cancelled by the customer`,
    });

    await notification.save();

    res.json({ 
      message: "Order cancelled successfully", 
      order: order
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ 
      message: "Error cancelling order", 
      error: error.message 
    });
  }
};

// Update order status (for owner) - Fixed version
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId).populate("listing");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (
      order.owner.toString() !== req.user.userId.toString() &&
      order.user.toString() !== req.user.userId.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this order" });
    }

    // Only allow user (renter) to cancel their own order
    if (order.user.toString() === req.user.userId.toString()) {
      if (status !== "cancelled") {
        return res.status(403).json({ message: "You can only cancel your own order." });
      }
    }

    // Ensure backward compatibility for existing orders
    if (!order.subtotal && order.totalPrice) {
      order.subtotal = Math.round(order.totalPrice / 1.2);
    }
    if (!order.platformFee && order.subtotal) {
      order.platformFee = Math.round(order.subtotal * 0.1);
    }
    if (!order.insuranceFee && order.subtotal) {
      order.insuranceFee = Math.round(order.subtotal * 0.1);
    }

    order.status = status;
    
    // Update listing status based on order status
    if (order.listing) {
      const listing = await Listing.findById(order.listing._id);
      if (listing) {
        if (status === "approved") {
          // If approved, set to rented
          listing.status = "rented";
          
        } else if (status === "rejected" || status === "cancelled") {
          // If rejected or cancelled, set back to available
          listing.status = "available";
          listing.reservedUntil = null;
          order.isActive = false;
        } else if (status === "completed") {
          // If completed, set back to available
          listing.status = "available";
          listing.reservedUntil = null;
        }
        await listing.save();
      }
    }
    
    if (status === "rejected") {
      order.isActive = false;
    }
    await order.save();

    // Create notification for the user
    const notification = new Notification({
      recipient: order.user,
      sender: req.user.userId,
      type: `order_${status}`,
      order: order._id,
      message: `Your order for ${order.listing?.name || 'the item'} has been ${status}`,
    });

    await notification.save();

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Error updating order status", error: error.message });
  }
};

// Check item availability
exports.checkAvailability = async (req, res) => {
  try {
    const { listingId, startDate, endDate } = req.body;

    const activeOrders = await Order.find({
      listing: listingId,
      isActive: true,
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
        { startDate: { $gte: startDate, $lte: endDate } },
      ],
    });

    const isAvailable = activeOrders.length === 0;

    res.json({
      isAvailable,
      message: isAvailable
        ? "Item is available for the selected dates"
        : "Item is not available for the selected dates",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking availability", error: error.message });
  }
};

// Calculate fee breakdown for price display
exports.calculateFeeBreakdown = async (req, res) => {
  try {
    const { subtotal } = req.body;
    
    if (!subtotal || subtotal <= 0) {
      return res.status(400).json({ message: "Valid subtotal is required" });
    }
    
    const platformFee = Math.round(subtotal * 0.1); // 10% platform fee
    const insuranceFee = Math.round(subtotal * 0.1); // 10% insurance fee
    const totalPrice = subtotal + platformFee + insuranceFee;
    
    res.json({
      subtotal: subtotal,
      platformFee: platformFee,
      insuranceFee: insuranceFee,
      totalPrice: totalPrice,
      breakdown: {
        platformFeeRate: 10,
        insuranceFeeRate: 10,
        totalFeeRate: 20
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error calculating fee breakdown", error: error.message });
  }
};

module.exports = {
  processPayment: exports.processPayment,
  getUserOrders: exports.getUserOrders,
  getOwnerOrders: exports.getOwnerOrders,
  updateOrderStatus: exports.updateOrderStatus,
  cancelOrder: exports.cancelOrder,
  checkAvailability: exports.checkAvailability,
  calculateFeeBreakdown: exports.calculateFeeBreakdown
};
