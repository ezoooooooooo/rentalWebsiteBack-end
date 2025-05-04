const mongoose = require("mongoose");

const ownerRatingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    score: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
    },
    // Aspects of owner service
    communication: {
      type: Number,
      min: 1,
      max: 5,
    },
    reliability: {
      type: Number,
      min: 1,
      max: 5,
    },
    itemCondition: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

// Compound index to ensure a user can only rate an owner once
ownerRatingSchema.index({ owner: 1, rater: 1 }, { unique: true });

module.exports = mongoose.model("OwnerRating", ownerRatingSchema);
