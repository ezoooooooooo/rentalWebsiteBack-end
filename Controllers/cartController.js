// controllers/cartController.js
const Cart = require("../Models/Cart");
const Listing = require("../Models/Listing");

// Add a listing to cart
const addToCart = async (req, res) => {
  try {
    const { listingId, rentalDays = 1 } = req.body;
    const userId = req.user.userId;

    console.log("Adding to cart - User ID:", userId);
    console.log("Listing ID:", listingId);
    console.log("Rental Days:", rentalDays);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res
        .status(404)
        .json({ success: false, message: "Listing not found" });
    }

    // Check if the item is already reserved or rented
    if (listing.status === "reserved" || listing.status === "rented") {
      return res.status(400).json({
        success: false,
        message: `This item is currently ${listing.status}. It's not available for rent at the moment.`,
      });
    }

    // Prevent user from adding their own items
    if (listing.owner.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "You cannot add your own items to the cart",
      });
    }

    // Find user's cart
    let cart = await Cart.findOne({ user: userId });
    console.log("Existing cart:", cart);

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      console.log("Created new cart:", cart);
    }

    // Check if item already exists in cart
    const existingItem = cart.items.find(
      (item) => item.listing.toString() === listingId
    );

    if (existingItem) {
      return res.status(200).json({
        success: true,
        alreadyInCart: true,
        message: "This item is already in your cart",
      });
    } else {
      cart.items.push({ listing: listingId, rentalDays });
      await cart.save();
      await cart.populate("items.listing", "name rentalRate images");
      console.log("Updated cart:", cart);

      return res.status(200).json({
        success: true,
        message: "Item added to cart",
        cart: cart.toObject(), // Convert to plain object
      });
    }
  } catch (error) {
    console.error("🚨 Error adding item to cart:", error);
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error: error.message,
    });
  }
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId; // Changed from _id to userId
    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User authentication required" });
    }

    const cart = await Cart.findOne({ user: userId }).populate(
      "items.listing",
      "name rentalRate images"
    );

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        cart: { user: userId, items: [] },
        totalPrice: 0,
      });
    }

    // Calculate total price
    const totalPrice = cart.items.reduce(
      (sum, item) => sum + item.listing.rentalRate * item.rentalDays,
      0
    );

    res
      .status(200)
      .json({ success: true, cart, totalPrice: totalPrice.toFixed(2) });
  } catch (error) {
    console.error("🚨 Error fetching cart:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching cart",
      error: error.message,
    });
  }
};

// Remove item from cart
const removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId; // Changed from _id to userId

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User authentication required" });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Log before filtering
    console.log("Cart items before removal:", cart.items);
    console.log("Item ID to remove:", itemId);

    // Fix: Remove by `listing` instead of `_id`
    cart.items.forEach((item) =>
      console.log("Item ID in cart:", item._id, "Listing ID:", item.listing)
    );
    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);

    console.log("Cart items after removal:", cart.items);
    await cart.save();

    res
      .status(200)
      .json({ success: true, message: "Item removed from cart", cart });
  } catch (error) {
    console.error("🚨 Error removing item from cart:", error);
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error: error.message,
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId; // Changed from _id to userId

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User authentication required" });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ success: true, message: "Cart cleared", cart });
  } catch (error) {
    console.error("🚨 Error clearing cart:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error: error.message,
    });
  }
};

// Update cart item quantity and rental days
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { rentalDays } = req.body;
    const userId = req.user.userId; // Changed from _id to userId

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, message: "User authentication required" });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    // Find the item by its _id (not using .id() method)
    const itemToUpdate = cart.items.find(
      (item) => item._id.toString() === itemId
    );

    if (!itemToUpdate) {
      return res
        .status(404)
        .json({ success: false, message: "Cart item not found" });
    }

    // Update rental days (ensure it's at least 1)
    if (rentalDays) {
      itemToUpdate.rentalDays = Math.max(1, rentalDays);
    }

    await cart.save();
    await cart.populate("items.listing", "name rentalRate images");

    // Calculate total price
    let totalPrice = 0;
    cart.items.forEach((item) => {
      totalPrice += item.listing.rentalRate * item.rentalDays;
    });

    res.status(200).json({
      success: true,
      message: "Cart item updated",
      cart,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
    });
  } catch (error) {
    console.error("🚨 Error updating cart item:", error);
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error: error.message,
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  clearCart,
  updateCartItem,
};
