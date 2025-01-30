const Listing = require('../Models/Listing');

// Get all listings
exports.getAllListings = async (req, res) => {
    try {
        const { search } = req.query;  // Get search query if provided

        // Validate search query
        if (search && typeof search !== 'string') {
            return res.status(400).json({ error: "Invalid search query" });
        }

        let filter = {};

        // If there's a search term, apply filtering to the query
        if (search) {
            filter = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },  // Match name
                    { description: { $regex: search, $options: 'i' } },  // Match description
                    { category: { $regex: search, $options: 'i' } }  // Match category
                ]
            };
        }

        // Fetch listings with or without filter based on search
        const listings = await Listing.find(filter).populate('owner', 'firstName lastName email');
        res.json(listings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// Create a new listing
exports.createListing = async (req, res) => {
 try {
     const { name, description, category, rentalRate } = req.body;
     const images = req.files.map(file => file.path);
     const owner = req.user.userId; 

     if (!name || !description || !category || !rentalRate) {
         return res.status(400).json({ message: 'All fields are required' });
     }

     const newListing = new Listing({
         name,
         description,
         category,
         rentalRate,
         images,
         owner
     });

     await newListing.save();
     res.status(201).json({ message: 'Listing created successfully', listing: newListing });
 } catch (error) {
     console.error(error);
     res.status(500).json({ message: 'Server error' });
 }
};
// Delete a listing
exports.deleteListing = async (req, res) => {
    const { userId } = req.user;

    try {
        const listing = await Listing.findById(req.params.id);
        if (!listing) {
            return res.status(404).json({ error: 'Listing not found' });
        }

        if (listing.owner.toString() !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await Listing.findByIdAndDelete(req.params.id);
        res.json({ message: 'Listing deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
exports.getUserListings = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log("Fetching listings for user:", userId);

        // Fetch listings where `owner` matches the logged-in user
        const userListings = await Listing.find({ owner: userId });

        if (!userListings.length) {
            return res.status(404).json({ message: 'No listings found for this user' });
        }

        res.status(200).json(userListings);
    } catch (error) {
        console.error('Error fetching user listings:', error);
        res.status(500).json({ message: 'Failed to fetch user listings' });
    }
};