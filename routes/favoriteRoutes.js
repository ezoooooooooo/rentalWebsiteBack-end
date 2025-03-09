// routes/favoriteRoutes.js
const express = require('express');
const router = express.Router();
const favoriteController = require('../Controllers/favoriteController');
const { verifyToken } = require('../middleware/auth.middleware');
const favoriteMiddleware = require('../middleware/favoriteMiddleware');

// Add a listing to favorites
router.post(
    '/add', 
    verifyToken,
    favoriteMiddleware.checkNotOwnListing, 
    favoriteController.addToFavorites
);

// Remove a listing from favorites
router.delete(
    '/remove/:listingId', 
    verifyToken,
    favoriteController.removeFromFavorites
);

// Get all favorites for the authenticated user
router.get(
    '/my-favorites', 
    verifyToken,
    favoriteController.getUserFavorites
);

// Check if a listing is in user's favorites
router.get(
    '/check/:listingId', 
    verifyToken,
    favoriteController.checkFavoriteStatus
);

module.exports = router;