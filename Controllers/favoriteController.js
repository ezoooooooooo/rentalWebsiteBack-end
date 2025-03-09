// controllers/favoriteController.js
const Favorite = require('../Models/favorite');
const Listing = require('../Models/Listing');

// Add a listing to favorites
exports.addToFavorites = async (req, res) => {
    try {
     
   
     
     
        const { listingId } = req.body;
        const userId = req.user?.userId;


        // Check if listing exists
        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        // Create new favorite
        const favorite = new Favorite({
            user: userId,
            listing: listingId
        });

        await favorite.save();
        
        return res.status(201).json({ 
            message: 'Listing added to favorites',
            favorite: favorite
        });
    } catch (error) {
     console.error('Error details:', error);
        // Check for duplicate key error (user already favorited this listing)
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This listing is already in your favorites' });
        }
        
        return res.status(500).json({ 
            message: 'Failed to add to favorites', 
            error: error.message 
        });
    }
};

// Remove a listing from favorites
exports.removeFromFavorites = async (req, res) => {
    try {
        const listingId = req.params.listingId;
        const userId = req.user?.userId;

        const result = await Favorite.findOneAndDelete({ 
            user: userId, 
            listing: listingId 
        });

        if (!result) {
            return res.status(404).json({ message: 'Favorite not found' });
        }

        return res.status(200).json({ message: 'Listing removed from favorites' });
    } catch (error) {
        return res.status(500).json({ 
            message: 'Failed to remove from favorites', 
            error: error.message 
        });
    }
};

// Get all favorites for a user
exports.getUserFavorites = async (req, res) => {
    try {
     const userId = req.user?.userId;

        const favorites = await Favorite.find({ user: userId })
            .populate({
                path: 'listing',
                select: 'name description category rentalRate images'
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: favorites.length,
            favorites: favorites
        });
    } catch (error) {
        return res.status(500).json({ 
            message: 'Failed to fetch favorites', 
            error: error.message 
        });
    }
};

// Check if a listing is in user's favorites
exports.checkFavoriteStatus = async (req, res) => {
    try {
        const listingId = req.params.listingId;
        const userId = req.user?.userId;

        const favorite = await Favorite.findOne({ 
            user: userId, 
            listing: listingId 
        });

        return res.status(200).json({
            isFavorite: !!favorite
        });
    } catch (error) {
        return res.status(500).json({ 
            message: 'Failed to check favorite status', 
            error: error.message 
        });
    }
};