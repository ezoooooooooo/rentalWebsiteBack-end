const RenterRating = require("../Models/RenterRating");
const User = require("../Models/userModel");
const Order = require("../Models/Order");
const mongoose = require("mongoose");

// Add a new renter rating
exports.addRenterRating = async (req, res) => {
  try {
    const {
      renterId,
      score,
      comment,
      communication,
      reliability,
      itemCare,
      timeliness,
    } = req.body;
    const raterId = req.user.userId;

    // Check that renter and rater are different users
    if (renterId === raterId) {
      return res.status(400).json({
        success: false,
        message: "You cannot rate yourself",
      });
    }

    // Check if owner has already rated this renter
    const existingRating = await RenterRating.findOne({
      renter: renterId,
      rater: raterId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this renter",
      });
    }

    // Check if the rater (owner) has had a completed rental with this renter

    const rentalOrder = await Order.findOne({
      owner: raterId,
      user: renterId,
      paymentStatus: "completed",
      status: { $in: ["completed", "approved"] }
    });
    

    if (!rentalOrder) {
      
      return res.status(403).json({
        success: false,
        message: "You can only rate renters who have completed rentals with you",
      });
    }

    // Create the rating
    const rating = await RenterRating.create({
      renter: renterId,
      rater: raterId,
      score,
      comment,
      communication,
      reliability,
      itemCare,
      timeliness,
    });

    // Update the renter's rating statistics
    await updateRenterRatings(renterId);

    res.status(201).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error adding renter rating:", error);
    res.status(500).json({
      success: false,
      message: "Error adding renter rating",
      error: error.message,
    });
  }
};

// Get all ratings for a renter
exports.getRenterRatings = async (req, res) => {
  try {
    const { renterId } = req.params;

    const ratings = await RenterRating.find({ renter: renterId })
      .populate("rater", "firstName lastName username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings,
    });
  } catch (error) {
    console.error("Error getting renter ratings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting renter ratings",
      error: error.message,
    });
  }
};

// Update a renter rating
exports.updateRenterRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { score, comment, communication, reliability, itemCare, timeliness } =
      req.body;
    const raterId = req.user.userId;

    // Find the rating
    const rating = await RenterRating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    // Check if the rating was created by this user
    if (rating.rater.toString() !== raterId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this rating",
      });
    }

    // Check if the rater (owner) has had a completed rental with this renter
    
    const rentalOrder = await Order.findOne({
      owner: raterId,
      user: rating.renter,
      paymentStatus: "completed",
      status: { $in: ["completed", "approved"] }
    });
    

    if (!rentalOrder) {
      
      return res.status(403).json({
        success: false,
        message: "You can only update ratings for renters who have completed rentals with you",
      });
    }

    // Update the rating
    rating.score = score || rating.score;
    rating.comment = comment !== undefined ? comment : rating.comment;
    rating.communication = communication || rating.communication;
    rating.reliability = reliability || rating.reliability;
    rating.itemCare = itemCare || rating.itemCare;
    rating.timeliness = timeliness || rating.timeliness;

    await rating.save();

    // Update the renter's rating statistics
    await updateRenterRatings(rating.renter);

    res.status(200).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error updating renter rating:", error);
    res.status(500).json({
      success: false,
      message: "Error updating renter rating",
      error: error.message,
    });
  }
};

// Delete a renter rating
exports.deleteRenterRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const raterId = req.user.userId;

    // Find the rating
    const rating = await RenterRating.findById(ratingId);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found",
      });
    }

    // Check if the rating was created by this user
    if (rating.rater.toString() !== raterId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this rating",
      });
    }

    // Check if the rater (owner) has had a completed rental with this renter
    
    const rentalOrder = await Order.findOne({
      owner: raterId,
      user: rating.renter,
      paymentStatus: "completed",
      status: { $in: ["completed", "approved"] }
    });
    

    if (!rentalOrder) {
      
      return res.status(403).json({
        success: false,
        message: "You can only delete ratings for renters who have completed rentals with you",
      });
    }

    const renterId = rating.renter;

    // Delete the rating
    await RenterRating.findByIdAndDelete(ratingId);

    // Update the renter's rating statistics
    await updateRenterRatings(renterId);

    res.status(200).json({
      success: true,
      message: "Renter rating deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting renter rating:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting renter rating",
      error: error.message,
    });
  }
};

// Helper function to update a renter's average rating and counts
async function updateRenterRatings(renterId) {
  const aggregateResult = await RenterRating.aggregate([
    { $match: { renter: new mongoose.Types.ObjectId(renterId) } },
    {
      $group: {
        _id: "$renter",
        renterRating: { $avg: "$score" },
        renterRatingCount: { $sum: 1 },
        renterCommunicationRating: { $avg: "$communication" },
        renterReliabilityRating: { $avg: "$reliability" },
        renterItemCareRating: { $avg: "$itemCare" },
        renterTimelinessRating: { $avg: "$timeliness" },
      },
    },
  ]);

  if (aggregateResult.length > 0) {
    const result = aggregateResult[0];
    await User.findByIdAndUpdate(renterId, {
      renterRating: Math.round(result.renterRating * 10) / 10,
      renterRatingCount: result.renterRatingCount,
      renterCommunicationRating: result.renterCommunicationRating
        ? Math.round(result.renterCommunicationRating * 10) / 10
        : 0,
      renterReliabilityRating: result.renterReliabilityRating
        ? Math.round(result.renterReliabilityRating * 10) / 10
        : 0,
      renterItemCareRating: result.renterItemCareRating
        ? Math.round(result.renterItemCareRating * 10) / 10
        : 0,
      renterTimelinessRating: result.renterTimelinessRating
        ? Math.round(result.renterTimelinessRating * 10) / 10
        : 0,
    });
  } else {
    // If no ratings, reset to defaults
    await User.findByIdAndUpdate(renterId, {
      renterRating: 0,
      renterRatingCount: 0,
      renterCommunicationRating: 0,
      renterReliabilityRating: 0,
      renterItemCareRating: 0,
      renterTimelinessRating: 0,
    });
  }
} 