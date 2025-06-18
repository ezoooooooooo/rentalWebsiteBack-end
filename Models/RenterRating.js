const mongoose = require("mongoose");

const renterRatingSchema = new mongoose.Schema(
  {
    renter: {
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
    // Aspects of renter behavior
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
    itemCare: {
      type: Number,
      min: 1,
      max: 5,
    },
    timeliness: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

// Compound index to ensure an owner can only rate a renter once per rental
renterRatingSchema.index({ renter: 1, rater: 1 }, { unique: true });

module.exports = mongoose.model("RenterRating", renterRatingSchema); 