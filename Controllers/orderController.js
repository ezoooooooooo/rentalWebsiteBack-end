const Order = require("../Models/Order");
const Notification = require("../Models/Notification");
const Listing = require("../Models/Listing");
const Cart = require("../Models/Cart");

// Process payment and create order
exports.processPayment = async (req, res) => {
  try {
    const { cartId, startDate, endDate, rentalDays, totalPrice: requestTotalPrice } = req.body;
    const userId = req.user.userId;

    console.log("Processing payment for user:", userId);
    console.log("Cart ID:", cartId);
    console.log("Request body:", req.body);

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

    console.log("Cart items for payment:", JSON.stringify(cart.items, null, 2));

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
        let itemTotalPrice;
        let basePrice;
        
        if (requestTotalPrice) {
          // If a single totalPrice is provided for all items, divide it proportionally
          if (cart.items.length > 1) {
            const thisItemRate = listing.rentalRate * itemRentalDays;
            const allItemsTotal = cart.items.reduce((sum, cartItem) => {
              return sum + (cartItem.listing.rentalRate * (cartItem.rentalDays || rentalDays || 1));
            }, 0);
            
            basePrice = Math.round((thisItemRate / allItemsTotal) * requestTotalPrice);
          } else {
            // If there's only one item, use the provided totalPrice
            basePrice = requestTotalPrice;
          }
        } else {
          // Calculate based on rental rate and days
          basePrice = listing.rentalRate * itemRentalDays;
        }
        
        // Calculate insurance fee (10% of the base price)
        const insuranceFee = Math.round(basePrice * 0.1);
        
        // Add insurance fee to the base price
        itemTotalPrice = basePrice + insuranceFee;
        
        // Ensure we have a valid totalPrice (minimum 1)
        itemTotalPrice = Math.max(1, itemTotalPrice);
        
        console.log(`Creating order for listing: ${listing.name}, Rate: ${listing.rentalRate}, Days: ${itemRentalDays}, Base Price: ${basePrice}, Insurance: ${insuranceFee}, Total: ${itemTotalPrice}`);
        
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
          totalPrice: itemTotalPrice,
          paymentStatus: "completed",
          status: "pending",
          isActive: true
        };
        
        console.log("Creating order with data:", orderData);
        
        const order = new Order(orderData);
        const savedOrder = await order.save();
        console.log("Order saved successfully:", savedOrder._id);
        
        // Update the listing status to 'reserved'
        listing.status = "reserved";
        
        // Use the order's endDate for reservedUntil
        listing.reservedUntil = orderData.endDate;
        
        try {
          await listing.save();
          console.log(`Listing ${listing._id} status updated to 'reserved' until ${orderData.endDate}`);
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
    console.log("Fetching owner orders for user ID:", userId);
    
    // Find orders where this user is the owner
    const orders = await Order.find({ owner: userId })
      .populate("listing")
      .populate("user", "firstName lastName email");
    
    console.log(`Found ${orders.length} orders for owner ${userId}`);
    
    // If no orders found, let's check if there are any orders at all
    if (orders.length === 0) {
      const allOrders = await Order.find({}).select('_id owner');
      console.log("All orders in system:", allOrders);
      
      // Check if the user owns any listings
      const userListings = await Listing.find({ owner: userId }).select('_id');
      console.log("Listings owned by user:", userListings);
    }
    
    res.json(orders);
  } catch (error) {
    console.error("Error fetching owner orders:", error);
    res
      .status(500)
      .json({ message: "Error fetching orders", error: error.message });
  }
};

// Update order status (for owner)
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

    order.status = status;
    
    // Update listing status based on order status
    const listing = await Listing.findById(order.listing._id);
    if (listing) {
      if (status === "approved") {
        // If approved, set to rented
        listing.status = "rented";
        console.log(`Listing ${listing._id} status updated to 'rented'`);
      } else if (status === "rejected" || status === "cancelled") {
        // If rejected or cancelled, set back to available
        listing.status = "available";
        listing.reservedUntil = null;
        order.isActive = false;
        console.log(`Listing ${listing._id} status updated to 'available'`);
      } else if (status === "completed") {
        // If completed, set back to available
        listing.status = "available";
        listing.reservedUntil = null;
        console.log(`Listing ${listing._id} status updated to 'available'`);
      }
      await listing.save();
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
      message: `Your order for ${order.listing.name || 'the item'} has been ${status}`,
    });

    await notification.save();

    res.json({ message: "Order status updated successfully", order });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating order status", error: error.message });
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
