const Rating = require("../Models/Rating");
const Listing = require("../Models/Listing");
const Order = require("../Models/Order");
const mongoose = require("mongoose");

// Add a new rating
exports.addRating = async (req, res) => {
  try {
    const { listingId, score, comment } = req.body;
    const userId = req.user.userId;

    // Check if the listing exists
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Check if the user is the owner of the listing
    if (listing.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot rate your own listing",
      });
    }

    // Check if the user has already rated this listing
    const existingRating = await Rating.findOne({
      listing: listingId,
      user: userId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this listing",
      });
    }

    // Check if the user has a completed order with payment for this listing
    console.log('[DEBUG] Checking order for rating:', { userId, listingId });
    const userOrder = await Order.findOne({
      listing: listingId,
      user: userId,
      paymentStatus: "completed",
      $or: [
        { status: "completed" },
        { status: "approved" }
      ]
    });
    console.log('[DEBUG] Order found for rating:', userOrder);

    if (!userOrder) {
      console.log('[DEBUG] No valid order found, blocking rating');
      return res.status(403).json({
        success: false,
        message: "You can only rate items you have paid for and ordered",
      });
    }

    // Create the new rating
    const rating = await Rating.create({
      listing: listingId,
      user: userId,
      score,
      comment,
    });

    // Update the listing's average rating and count
    await updateListingRatings(listingId);

    res.status(201).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error adding rating:", error);
    res.status(500).json({
      success: false,
      message: "Error adding rating",
      error: error.message,
    });
  }
};

// Get all ratings for a listing
exports.getListingRatings = async (req, res) => {
  try {
    const { listingId } = req.params;

    const ratings = await Rating.find({ listing: listingId })
      .populate("user", "firstName lastName username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings,
    });
  } catch (error) {
    console.error("Error getting ratings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting ratings",
      error: error.message,
    });
  }
};

// Update a rating
exports.updateRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { score, comment } = req.body;
    const userId = req.user.userId;

    // Find the rating
    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    // Check if the rating belongs to the user
    if (rating.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this rating",
      });
    }

    // Check if the user has a completed order with payment for this listing
    console.log('[DEBUG] Checking order for updating rating:', { userId, listingId: rating.listing });
    const userOrder = await Order.findOne({
      listing: rating.listing,
      user: userId,
      paymentStatus: "completed",
      $or: [
        { status: "completed" },
        { status: "approved" }
      ]
    });
    console.log('[DEBUG] Order found for updating rating:', userOrder);

    if (!userOrder) {
      console.log('[DEBUG] No valid order found, blocking rating update');
      return res.status(403).json({
        success: false,
        message: "You can only update ratings for items you have paid for and ordered",
      });
    }

    // Update the rating
    rating.score = score || rating.score;
    rating.comment = comment !== undefined ? comment : rating.comment;
    await rating.save();

    // Update the listing's average rating
    await updateListingRatings(rating.listing);

    res.status(200).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error updating rating:", error);
    res.status(500).json({
      success: false,
      message: "Error updating rating",
      error: error.message,
    });
  }
};

// Delete a rating
exports.deleteRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.userId;

    // Find the rating
    const rating = await Rating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    // Check if the rating belongs to the user
    if (rating.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this rating",
      });
    }

    // Check if the user has a completed order with payment for this listing
    console.log('[DEBUG] Checking order for deleting rating:', { userId, listingId: rating.listing });
    const userOrder = await Order.findOne({
      listing: rating.listing,
      user: userId,
      paymentStatus: "completed",
      $or: [
        { status: "completed" },
        { status: "approved" }
      ]
    });
    console.log('[DEBUG] Order found for deleting rating:', userOrder);

    if (!userOrder) {
      console.log('[DEBUG] No valid order found, blocking rating deletion');
      return res.status(403).json({
        success: false,
        message: "You can only delete ratings for items you have paid for and ordered",
      });
    }

    const listingId = rating.listing;

    // Delete the rating
    await Rating.findByIdAndDelete(ratingId);

    // Update the listing's average rating
    await updateListingRatings(listingId);

    res.status(200).json({
      success: true,
      message: "Rating deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting rating:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting rating",
      error: error.message,
    });
  }
};

// Helper function to update a listing's average rating and count
async function updateListingRatings(listingId) {
  const aggregateResult = await Rating.aggregate([
    { $match: { listing: new mongoose.Types.ObjectId(listingId) } },
    {
      $group: {
        _id: "$listing",
        avgRating: { $avg: "$score" },
        ratingCount: { $sum: 1 },
      },
    },
  ]);

  if (aggregateResult.length > 0) {
    await Listing.findByIdAndUpdate(listingId, {
      avgRating: Math.round(aggregateResult[0].avgRating * 10) / 10, // Round to 1 decimal place
      ratingCount: aggregateResult[0].ratingCount,
    });
  } else {
    // If no ratings, reset to defaults
    await Listing.findByIdAndUpdate(listingId, {
      avgRating: 0,
      ratingCount: 0,
    });
  }
}
