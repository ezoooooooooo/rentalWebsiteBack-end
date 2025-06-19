const Listing = require('../Models/Listing');
const Order = require('../Models/Order');
const cloudinary = require('../config/cloudinary');

// Get all listings
exports.getAllListings = async (req, res) => {
    try {
        const { search, category } = req.query;  // Get search query and category if provided

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

        // If category is provided, add it to the filter
        if (category) {
            filter.category = category;
        }

        // Fetch listings with or without filter based on search
        const listings = await Listing.find(filter).populate('owner', 'firstName lastName email');
        
        // Check current date for availability
        const currentDate = new Date();
        
        // Add availability information to each listing
        const listingsWithAvailability = listings.map(listing => {
            const listingObj = listing.toObject();
            
            // If the listing is already marked as reserved or rented, keep that status
            if (listing.status === 'reserved' || listing.status === 'rented') {
                listingObj.isAvailable = false;
                
                // Add reservation end date if available
                if (listing.reservedUntil) {
                    listingObj.availableAfter = listing.reservedUntil;
                }
            } else {
                // Otherwise, it's available
                listingObj.isAvailable = true;
            }
            
            return listingObj;
        });
        
        res.json(listingsWithAvailability);
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
  
    
    const { id } = req.params; // Listing ID
    const { name, description, category, rentalRate, removedImages } = req.body;
    const userId = req.user ? req.user.userId : null; // Check if req.user exists



    try {
        // Find the listing by ID
        let listing = await Listing.findById(id);

        if (!listing) {
            console.error('❌ Listing not found:', id);
            return res.status(404).json({ message: 'Listing not found' });
        }

        

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

  

            listing.images = listing.images.filter(image => {
                const shouldRemove = removeImages.some(
                    removeId => 
                        removeId === image.public_id || 
                        removeId === image.url.split('/').pop()
                );

                if (shouldRemove) {
                    if (cloudinary.uploader && cloudinary.uploader.destroy) {
                        cloudinary.uploader.destroy(image.public_id)
                            .catch(err => console.error("❌ Cloudinary deletion error:", err));
                    }
                }
                

                return !shouldRemove; // Keep only images that are NOT in `removedImages`
            });


        }

        // **Adding new images (if uploaded)**
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => ({
                url: file.path,
                public_id: file.filename
            }));



            listing.images.push(...newImages); // ✅ Append new images instead of replacing
        }



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
    

        // Fetch listings where `owner` matches the logged-in user
        const userListings = await Listing.find({ owner: userId });

        if (!userListings.length) {
            return res.status(200).json([]);
        }

        // Get active orders for these listings
        const listingIds = userListings.map(listing => listing._id);
        const activeOrders = await Order.find({
            listing: { $in: listingIds },
            isActive: true
        }).select('listing startDate endDate status');

        // Create a map of listing IDs to their active orders
        const listingOrdersMap = {};
        activeOrders.forEach(order => {
            if (!listingOrdersMap[order.listing.toString()]) {
                listingOrdersMap[order.listing.toString()] = [];
            }
            listingOrdersMap[order.listing.toString()].push({
                orderId: order._id,
                startDate: order.startDate,
                endDate: order.endDate,
                status: order.status
            });
        });

        // Add order information to each listing
        const listingsWithOrders = userListings.map(listing => {
            const listingObj = listing.toObject();
            listingObj.activeOrders = listingOrdersMap[listing._id.toString()] || [];
            return listingObj;
        });

        res.status(200).json(listingsWithOrders);
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

        // Check if there are any active orders for this listing
        const activeOrders = await Order.find({
            listing: id,
            isActive: true
        }).select('startDate endDate status');

        // Convert to a plain object so we can add properties
        const listingObj = listing.toObject();
        
        // Add availability information
        if (listing.status === 'reserved' || listing.status === 'rented') {
            listingObj.isAvailable = false;
            
            // Add reservation end date if available
            if (listing.reservedUntil) {
                listingObj.availableAfter = listing.reservedUntil;
            }
            
            // Add active orders information
            listingObj.activeOrders = activeOrders.map(order => ({
                startDate: order.startDate,
                endDate: order.endDate,
                status: order.status
            }));
        } else {
            listingObj.isAvailable = true;
            listingObj.activeOrders = [];
        }

        res.status(200).json(listingObj);
    } catch (error) {
        console.error('Error fetching listing:', error);
        res.status(500).json({ message: 'Error fetching listing', error: error.message });
    }
};