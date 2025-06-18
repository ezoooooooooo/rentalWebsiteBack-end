const Listing = require('../Models/Listing');

const checkNotOwner = async (req, res, next) => {
  try {
    const listingId = req.body.listingId || req.params.listingId; // Check both body & params
    const userId = req.user ? req.user.userId : null;

    // ✅ Debugging logs
    console.log("Middleware checkNotOwner called");
    console.log("Received listingId:", listingId);
    console.log("Logged-in userId:", userId);

    if (!listingId) {
      return res.status(400).json({ success: false, message: 'Listing ID is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const listing = await Listing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // ✅ Avoid crashing if `listing.owner` is undefined
    if (!listing.owner) {
      return res.status(500).json({ success: false, message: 'Listing has no owner' });
    }

    // ✅ Check if logged-in user is the owner
    if (listing.owner.toString() === userId.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'You cannot add your own listing to cart' 
      });
    }

    // ✅ Store the listing in request for later use
    req.listing = listing;
    next();
  } catch (error) {
    console.error("Error in checkNotOwner:", error.message); // ✅ Log error
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

module.exports = { checkNotOwner };
