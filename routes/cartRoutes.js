// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware'); // Your auth middleware
const { checkNotOwner } = require('../middleware/checkOwnership');
const { 
  addToCart, 
  getCart, 
  removeFromCart, 
  clearCart, 
  updateCartItem 
} = require('../Controllers/cartController');
console.log({ addToCart, getCart, removeFromCart, clearCart, updateCartItem });

// Get cart
router.get('/cart', verifyToken, getCart);

// Add to cart (with ownership check)
router.post('/cart', verifyToken, checkNotOwner, addToCart);

// Update cart item
router.put('/cart/:itemId', verifyToken, updateCartItem);

// Remove from cart
router.delete('/cart/:itemId', verifyToken, removeFromCart);

// Clear cart
router.delete('/cart', verifyToken, clearCart);

module.exports = router;