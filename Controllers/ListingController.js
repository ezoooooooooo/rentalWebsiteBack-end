const Listing = require('../Models/Listing');
const upload = require('../middleware/upload');
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
exports.editListing = async (req, res) => {
    const { id } = req.params; // Listing ID
    const { name, description, category, rentalRate } = req.body;
    const userId = req.user ? req.user.userId : null; // Check if req.user exists

    console.log('🟢 Received update request for listing:', id);
    console.log('📄 Request body:', req.body);
    console.log('📸 Uploaded files:', req.files);
    console.log('🔍 Authenticated User ID:', userId);

    try {
        // Find the listing by ID
        let listing = await Listing.findById(id);

        if (!listing) {
            console.error('❌ Listing not found:', id);
            return res.status(404).json({ message: 'Listing not found' });
        }

        console.log('🔍 Found listing:', listing);
        console.log('👤 Listing owner ID:', listing.owner);

        // Check if the authenticated user is the owner of the listing
        if (!userId || !listing.owner) {
            console.error('🚨 Missing user ID or listing owner');
            return res.status(403).json({ message: 'Unauthorized: Missing user ID or listing owner' });
        }

        if (listing.owner.toString() !== userId.toString()) {
            console.error('🚫 Unauthorized update attempt by user:', userId);
            return res.status(403).json({ message: 'You are not authorized to edit this listing' });
        }

        // Update the listing fields
        listing.name = name || listing.name;
        listing.description = description || listing.description;
        listing.category = category || listing.category;
        listing.rentalRate = rentalRate || listing.rentalRate;

        // Handle image uploads (if new images are provided)
        if (req.files && req.files.length > 0) {
            const imagePaths = req.files.map(file => `/uploads/${file.filename}`);
            listing.images = imagePaths; // Replace existing images with new ones
        }

        console.log('✅ Updated listing:', listing);

        // Save the updated listing
        await listing.save();

        return res.json({ message: 'Listing updated successfully', listing });
    } catch (error) {
        console.error('❌ Error updating listing:', error.message);

        if (!res.headersSent) {
            return res.status(500).json({ message: 'Error updating listing', error: error.message });
        }
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
// Get a specific listing by ID
exports.getListingById = async (req, res) => {
    try {
        const { id } = req.params;

        // Find listing by ID and populate owner details
        const listing = await Listing.findById(id).populate('owner', 'firstName lastName email');

        if (!listing) {
            return res.status(404).json({ message: 'Listing not found' });
        }

        res.status(200).json(listing);
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ message: 'Error fetching listing', error: error.message });
    }
};
