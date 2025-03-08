const Listing = require('../Models/Listing');
const cloudinary = require('../config/cloudinary');
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
     const images = req.files && req.files.length > 0 
     ? req.files.map(file => ({
         url: file.path,
         public_id: file.filename
       }))
     : [];
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
    console.log("📩 Received removedImages from frontend:", req.body.removedImages);
    
    const { id } = req.params; // Listing ID
    const { name, description, category, rentalRate, removedImages } = req.body;
    const userId = req.user ? req.user.userId : null; // Check if req.user exists

    console.log('🟢 Detailed Listing Update Request');
    console.log('🆔 Listing ID:', id);
    console.log('📄 Request Body:', JSON.stringify(req.body, null, 2));
    console.log('📸 Uploaded Files:', req.files);
    console.log('👤 User ID:', userId);
    console.log('🗑️ Removed Images (Raw):', removedImages);

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

        let removeImages = [];
        if (removedImages) {
            try {
                // Try parsing, handle string and array
                removeImages = typeof removedImages === 'string' 
                    ? JSON.parse(removedImages) 
                    : removedImages;
                
                console.log('🔍 Processed Remove Images:', removeImages);
            } catch (error) {
                console.error('❌ Invalid removedImages format:', error);
                return res.status(400).json({ message: 'Invalid removedImages format' });
            }
        }

        // **Update listing fields**
        listing.name = name || listing.name;
        listing.description = description || listing.description;
        listing.category = category || listing.category;
        listing.rentalRate = rentalRate || listing.rentalRate;

        // **Removing images**
        if (removeImages.length > 0) {
            const initialImageCount = listing.images.length;

            console.log('🔍 Current Images Before Deletion:', listing.images.map(img => img.public_id));

            listing.images = listing.images.filter(image => {
                const shouldRemove = removeImages.some(
                    removeId => 
                        removeId === image.public_id || 
                        removeId === image.url.split('/').pop()
                );

                if (shouldRemove) {
                    console.log('🗑️ Removing image:', image.public_id);
                
                    if (cloudinary.uploader && cloudinary.uploader.destroy) {
                        cloudinary.uploader.destroy(image.public_id)
                            .then(result => console.log("✅ Cloudinary deletion:", result))
                            .catch(err => console.error("❌ Cloudinary deletion error:", err));
                    } else {
                        console.error("❌ Cloudinary uploader is undefined");
                    }
                }
                

                return !shouldRemove; // Keep only images that are NOT in `removedImages`
            });

            console.log(`🖼️ Images updated: ${initialImageCount} → ${listing.images.length}`);
            console.log('🔍 Current Images After Deletion:', listing.images.map(img => img.public_id));
        }

        // **Adding new images (if uploaded)**
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.path,
                public_id: file.filename
            }));

            console.log('📸 Adding New Images:', newImages);

            listing.images.push(...newImages); // ✅ Append new images instead of replacing
        }

        console.log('✅ Updated listing:', listing);

        // Save the updated listing
        await listing.save();

        return res.json({ message: 'Listing updated successfully', listing });
    } catch (error) {
        console.error('❌ Comprehensive Edit Error:', error);
        return res.status(500).json({ 
            message: 'Listing update failed', 
            error: error.message 
        });
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
        for (const image of listing.images) {
            if (image.public_id) {
              await cloudinary.uploader.destroy(image.public_id);
            }
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
            return res.status(200).json([]);
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