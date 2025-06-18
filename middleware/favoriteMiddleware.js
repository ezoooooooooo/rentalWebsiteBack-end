// middlewares/favoriteMiddleware.js
const Listing = require('../Models/Listing');

exports.checkNotOwnListing = async (req, res, next) => {
    try {
        const listingId = req.params.listingId || req.body.listingId;
        const userId = req.user?.userId;

        const listing = await Listing.findById(listingId);
        
        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        if (listing.owner.toString() === userId) {
            return res.status(400).json({ 
                message: 'You cannot add your own listing to favorites' 
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};