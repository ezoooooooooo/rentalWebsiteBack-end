const OwnerRating = require("../Models/OwnerRating");
const User = require("../Models/userModel");
const mongoose = require("mongoose");

// Add a new owner rating
exports.addOwnerRating = async (req, res) => {
  try {
    const {
      ownerId,
      score,
      comment,
      communication,
      reliability,
      itemCondition,
    } = req.body;
    const raterId = req.user.userId;

    // Check that owner and rater are different users
    if (ownerId === raterId) {
      return res.status(400).json({
        success: false,
        message: "You cannot rate yourself",
      });
    }

    // Check if user has already rated this owner
    const existingRating = await OwnerRating.findOne({
      owner: ownerId,
      rater: raterId,
    });

    if (existingRating) {
      return res.status(400).json({
        success: false,
        message: "You have already rated this owner",
      });
    }

    // Create the rating
    const rating = await OwnerRating.create({
      owner: ownerId,
      rater: raterId,
      score,
      comment,
      communication,
      reliability,
      itemCondition,
    });

    // Update the owner's rating statistics
    await updateOwnerRatings(ownerId);

    res.status(201).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error adding owner rating:", error);
    res.status(500).json({
      success: false,
      message: "Error adding owner rating",
      error: error.message,
    });
  }
};

// Get all ratings for an owner
exports.getOwnerRatings = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const ratings = await OwnerRating.find({ owner: ownerId })
      .populate("rater", "firstName lastName username")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings,
    });
  } catch (error) {
    console.error("Error getting owner ratings:", error);
    res.status(500).json({
      success: false,
      message: "Error getting owner ratings",
      error: error.message,
    });
  }
};

// Update an owner rating
exports.updateOwnerRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { score, comment, communication, reliability, itemCondition } =
      req.body;
    const raterId = req.user.userId;

    // Find the rating
    const rating = await OwnerRating.findById(ratingId);

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

    // Update the rating
    rating.score = score || rating.score;
    rating.comment = comment !== undefined ? comment : rating.comment;
    rating.communication = communication || rating.communication;
    rating.reliability = reliability || rating.reliability;
    rating.itemCondition = itemCondition || rating.itemCondition;

    await rating.save();

    // Update the owner's rating statistics
    await updateOwnerRatings(rating.owner);

    res.status(200).json({
      success: true,
      data: rating,
    });
  } catch (error) {
    console.error("Error updating owner rating:", error);
    res.status(500).json({
      success: false,
      message: "Error updating owner rating",
      error: error.message,
    });
  }
};

// Delete an owner rating
exports.deleteOwnerRating = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const raterId = req.user.userId;

    // Find the rating
    const rating = await OwnerRating.findById(ratingId);

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

    const ownerId = rating.owner;

    // Delete the rating
    await OwnerRating.findByIdAndDelete(ratingId);

    // Update the owner's rating statistics
    await updateOwnerRatings(ownerId);

    res.status(200).json({
      success: true,
      message: "Owner rating deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting owner rating:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting owner rating",
      error: error.message,
    });
  }
};

// Helper function to update an owner's average rating and counts
async function updateOwnerRatings(ownerId) {
  const aggregateResult = await OwnerRating.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(ownerId) } },
    {
      $group: {
        _id: "$owner",
        ownerRating: { $avg: "$score" },
        ownerRatingCount: { $sum: 1 },
        communicationRating: { $avg: "$communication" },
        reliabilityRating: { $avg: "$reliability" },
        itemConditionRating: { $avg: "$itemCondition" },
      },
    },
  ]);

  if (aggregateResult.length > 0) {
    const result = aggregateResult[0];
    await User.findByIdAndUpdate(ownerId, {
      ownerRating: Math.round(result.ownerRating * 10) / 10,
      ownerRatingCount: result.ownerRatingCount,
      communicationRating: result.communicationRating
        ? Math.round(result.communicationRating * 10) / 10
        : 0,
      reliabilityRating: result.reliabilityRating
        ? Math.round(result.reliabilityRating * 10) / 10
        : 0,
      itemConditionRating: result.itemConditionRating
        ? Math.round(result.itemConditionRating * 10) / 10
        : 0,
    });
  } else {
    // If no ratings, reset to defaults
    await User.findByIdAndUpdate(ownerId, {
      ownerRating: 0,
      ownerRatingCount: 0,
      communicationRating: 0,
      reliabilityRating: 0,
      itemConditionRating: 0,
    });
  }
}
